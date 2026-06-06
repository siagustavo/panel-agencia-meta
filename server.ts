import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";
const SELF_URL = process.env.SELF_URL || `http://localhost:${PORT}`;

// Memoria en vivo para que la IA recuerde el hilo de la conversación durante la prueba
const chatHistories: Record<string, any[]> = {};

interface MetaWebhookBody {
  object: string;
  entry?: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string; };
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string; };
        }>;
      };
    }>;
  }>;
}

// 1. ENDPOINTS PARA TU PANEL (CRUD)

app.get("/api/probadores", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("bots_config")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/registrar-probador", async (req: Request, res: Response) => {
  try {
    const { client_name, customer_phone, access_code, system_prompt, gemini_api_key, sheet_id, message_limit, email } = req.body;

    if (!client_name || !customer_phone || !access_code || !system_prompt || !gemini_api_key || !email) {
      return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    // Limpiamos el teléfono que ingresás a mano por las dudas
    const cleanedPhone = customer_phone.replace(/\D/g, "");

    const { data, error } = await supabase
      .from("bots_config")
      .insert([
        {
          client_name,
          customer_phone: cleanedPhone, // Atado al número del probador
          access_code,
          system_prompt,
          gemini_api_key,
          sheet_id: sheet_id || null,
          message_limit: message_limit ? parseInt(message_limit, 10) : 100,
          is_active: true,
          message_count: 0,
          email,
        },
      ])
      .select();

    if (error) throw error;
    return res.status(201).json({ success: true, data: data[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch("/api/probadores/:id/toggle", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { data, error } = await supabase
      .from("bots_config")
      .update({ is_active })
      .eq("id", id)
      .select();

    if (error) throw error;
    return res.status(200).json({ success: true, data: data[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. RECEPCIÓN DE WHATSAPP Y FILTRADO POR TELÉFONO DE PROBADOR

app.get("/webhook", (req: Request, res: Response) => {
  const verifyToken = process.env.VERIFY_TOKEN || "token_seguro_local";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req: Request, res: Response) => {
  const body = req.body as MetaWebhookBody;

  if (!body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    return res.sendStatus(200);
  }

  try {
    const changeValue = body.entry[0].changes[0].value;
    const message = changeValue.messages[0];
    
    const customer_phone = message.from; // El número de celular que está escribiendo
    const userMessageText = message.text?.body?.trim();

    if (!userMessageText) return res.sendStatus(200);

    // Buscamos si el número de teléfono que escribe coincide con algún cliente registrado en el panel
    const { data: botConfig, error } = await supabase
      .from("bots_config")
      .select("*")
      .eq("customer_phone", customer_phone)
      .maybeSingle();

    if (error || !botConfig) {
      // Si el número no está registrado en tu panel de pruebas, se ignora el mensaje
      return res.sendStatus(200);
    }

    // Control de interruptor de encendido/apagado manual
    if (!botConfig.is_active) {
      await enviarMensajeMeta(customer_phone, "⚠️ Esta demo de prueba se encuentra actualmente inactiva.");
      return res.sendStatus(200);
    }

    // Control de límite de mensajes cortado automático
    if (botConfig.message_count >= botConfig.message_limit) {
      await enviarMensajeMeta(customer_phone, "🛑 Has alcanzado el límite de mensajes permitidos para tu prueba gratuita.");
      return res.sendStatus(200);
    }

    // Inicializar o recuperar el historial de este cliente específico
    if (!chatHistories[customer_phone]) {
      chatHistories[customer_phone] = [];
    }

    // Guardamos lo que nos puso el cliente
    chatHistories[customer_phone].push({
      role: "user",
      parts: [{ text: userMessageText }]
    });

    // Procesamos con Gemini usando la API Key y el Prompt que le cargaste a ese cliente
    const botResponse = await generarRespuestaGemini(
      chatHistories[customer_phone],
      botConfig.system_prompt,
      botConfig.gemini_api_key
    );

    // Guardamos la respuesta del bot en el historial para que mantenga el hilo
    chatHistories[customer_phone].push({
      role: "model",
      parts: [{ text: botResponse }]
    });

    // Enviamos la respuesta directo por Meta
    await enviarMensajeMeta(customer_phone, botResponse);

    // Sumamos +1 al contador en Supabase en tiempo real
    await supabase
      .from("bots_config")
      .update({ message_count: botConfig.message_count + 1 })
      .eq("id", botConfig.id);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en Webhook:", error);
    return res.sendStatus(200);
  }
});

// 3. INTEGRACIONES CON GEMINI 2.5 FLASH Y META

async function generarRespuestaGemini(
  historial: any[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: historial,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No obtuve respuesta del motor.";
  } catch (error: any) {
    console.error("Error Gemini API:", error?.response?.data || error.message);
    return "Error temporal en el motor de IA.";
  }
}

async function enviarMensajeMeta(destinatario: string, texto: string): Promise<void> {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: destinatario,
        type: "text",
        text: { body: texto },
      },
      {
        headers: {
          Authorization: `Bearer ${META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error Meta API:", error?.response?.data || error.message);
  }
}

// 4. EVITAR SUSPENSIONES DE RENDER
app.get("/api/ping", (_req: Request, res: Response) => {
  res.status(200).send("pong");
});

setInterval(async () => {
  try {
    await axios.get(`${SELF_URL}/api/ping`);
  } catch {
    console.warn("Fallo el autoping.");
  }
}, 10 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Servidor central operativo en el puerto ${PORT}`);
});
