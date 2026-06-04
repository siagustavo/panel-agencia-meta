import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { z } from "zod";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { Client, Message } from "./src/types";

// Schema validations using Zod
const ClientSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  rubro: z.string().min(2, "El rubro debe tener al menos 2 caracteres"),
  status: z.boolean().default(true),
  sheetsLinked: z.boolean().default(false),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Formato de teléfono no válido de WhatsApp (E.164)").or(z.string().min(6)),
  provider: z.string().min(1, "El proveedor de WhatsApp es obligatorio"),
  provider_token: z.string().optional(),
  webhook_secret: z.string().optional(),
  sheets_url: z.string().optional(),
  payment_mercadopago: z.string().optional(),
  payment_uala_modo: z.string().optional(),
  payment_stripe: z.string().optional(),
  payment_paypal: z.string().optional(),
  gemini_api_key: z.string().optional(),
  ai_model: z.string().min(1, "El motor de IA es obligatorio"),
  system_prompt: z.string().default("Responder de forma asertiva y cordial."),
});

const WebhookPayloadSchema = z.object({
  clientId: z.string().uuid("ID de cliente debe ser un UUID válido").or(z.string().min(1, "ID de cliente no puede estar vacío")),
  senderName: z.string().min(2, "Nombre de remitente obligatorio"),
  senderPhone: z.string().min(5, "Número de teléfono obligatorio"),
  text: z.string().min(1, "El mensaje de texto no puede estar vacío"),
  incoming: z.boolean().optional().default(true),
});

function getGeminiClient(customKey?: string): GoogleGenAI | null {
  const key = customKey || process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// FUNCIÓN UNIVERSAL DINÁMICA - COMPATIBLE CON CUALQUIER SCRIPT
async function postToGoogleSheets(webAppUrl: string, payload: any) {
  if (!webAppUrl) return;
  try {
    console.log(`[Sheets Dinámico] Despachando leads al script: ${webAppUrl}`);
    await fetch(webAppUrl, {
      method: "POST",
      redirect: "follow",
      headers: { 
        "Content-Type": "text/plain;charset=utf-8" 
      },
      body: JSON.stringify(payload)
    });
    console.log(`[Sheets Status] Datos impactados con éxito en el script del cliente.`);
  } catch (err) {
    console.error("[Sheets Error] Error crítico al escribir en el script dinámico:", err);
  }
}

// Variables globales de la base de datos local
let clients: Client[] = [];
let messages: Message[] = [];

// Variables de Supabase que tomará desde Render
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Función para guardar en la nube de Supabase
async function saveDatabase() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/configuracion?id=eq.1`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ clients, messages })
    });
    console.log("[Database] Sincronizado con Supabase con éxito.");
  } catch (err) {
    console.error("[Database] Error al guardar en Supabase:", err);
  }
}

// Cargar base de datos desde Supabase al arrancar el servidor
async function loadDatabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/configuracion?id=eq.1`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        clients = data[0].clients || [];
        messages = data[0].messages || [];
        console.log(`[Database] Cargados ${clients.length} clientes desde Supabase.`);
        return;
      }
    }
    console.log("[Database] No se encontraron datos en Supabase. Inicializando vacío.");
  } catch (err) {
    console.error("[Database] Error al cargar desde Supabase, iniciando vacío:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const PORT = Number(process.env.PORT || 5000);

  // Ejecutamos la carga inicial al arrancar
  await loadDatabase();

  // SSE client references
  let sseClients: any[] = [];

  function broadcast(type: string, data: any) {
    console.log(`[SSE] Broadcasting event type: ${type}`);
    sseClients.forEach((client) => {
      client.write(`event: ${type}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }

  // 1. SSE Connection Endpoint for Live Chat & Client Dashboard updates
  app.get("/api/live-updates", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const clientId = crypto.randomUUID();
    const newClient = res;
    sseClients.push(newClient);
    console.log(`[SSE] Real-time client connected: ${clientId}. Total: ${sseClients.length}`);

    req.on("close", () => {
      sseClients = sseClients.filter((client) => client !== newClient);
      console.log(`[SSE] Real-time client disconnected: ${clientId}. Total: ${sseClients.length}`);
    });
  });

  // 2. Fetch all clients
  app.get("/api/clients", (req, res) => {
    res.json(clients);
  });

  // 3. Create a new client
  app.post("/api/clients", (req, res) => {
    try {
      const parsed = ClientSchema.parse(req.body);
      const newClient: Client = {
        id: crypto.randomUUID(),
        name: parsed.name,
        rubro: parsed.rubro,
        status: parsed.status,
        sheetsLinked: parsed.sheetsLinked,
        phone: parsed.phone.replace(/[\s\-\+\(\)]/g, ""),
        createdAt: new Date().toISOString(),
        provider: parsed.provider,
        provider_token: parsed.provider_token,
        webhook_secret: parsed.webhook_secret,
        sheets_url: parsed.sheets_url,
        payment_mercadopago: parsed.payment_mercadopago,
        payment_uala_modo: parsed.payment_uala_modo,
        payment_stripe: parsed.payment_stripe,
        payment_paypal: parsed.payment_paypal,
        gemini_api_key: parsed.gemini_api_key,
        ai_model: parsed.ai_model,
        system_prompt: parsed.system_prompt,
      };

      clients.push(newClient);
      saveDatabase();
      broadcast("CLIENTS_UPDATED", clients);
      res.status(201).json(newClient);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Datos de cliente no válidos", details: error.issues });
      } else {
        res.status(500).json({ error: "No se pudo crear el cliente" });
      }
    }
  });

  // 4. Update or Edit client details completely or partially
  app.patch("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const clientIndex = clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const {
      name, rubro, phone, status, sheetsLinked, provider, provider_token,
      webhook_secret, sheets_url, payment_mercadopago, payment_uala_modo,
      payment_stripe, payment_paypal, gemini_api_key, ai_model, system_prompt
    } = req.body;

    if (name !== undefined) clients[clientIndex].name = name;
    if (rubro !== undefined) clients[clientIndex].rubro = rubro;
    if (phone !== undefined) clients[clientIndex].phone = phone.replace(/[\s\-\+\(\)]/g, "");
    if (status !== undefined) clients[clientIndex].status = status;
    if (sheetsLinked !== undefined) clients[clientIndex].sheetsLinked = sheetsLinked;
    if (provider !== undefined) clients[clientIndex].provider = provider;
    if (provider_token !== undefined) clients[clientIndex].provider_token = provider_token;
    if (webhook_secret !== undefined) clients[clientIndex].webhook_secret = webhook_secret;
    if (sheets_url !== undefined) clients[clientIndex].sheets_url = sheets_url;
    if (payment_mercadopago !== undefined) clients[clientIndex].payment_mercadopago = payment_mercadopago;
    if (payment_uala_modo !== undefined) clients[clientIndex].payment_uala_modo = payment_uala_modo;
    if (payment_stripe !== undefined) clients[clientIndex].payment_stripe = payment_stripe;
    if (payment_paypal !== undefined) clients[clientIndex].payment_paypal = payment_paypal;
    if (gemini_api_key !== undefined) clients[clientIndex].gemini_api_key = gemini_api_key;
    if (ai_model !== undefined) clients[clientIndex].ai_model = ai_model;
    if (system_prompt !== undefined) clients[clientIndex].system_prompt = system_prompt;

    saveDatabase();
    broadcast("CLIENTS_UPDATED", clients);
    res.json(clients[clientIndex]);
  });

  // 4.5. Delete client completely
  app.delete("/api/clients/:id", (req, res) => {
    const { id } = req.params;
    const clientIndex = clients.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    clients.splice(clientIndex, 1);
    saveDatabase();
    broadcast("CLIENTS_UPDATED", clients);
    res.json({ success: true, message: "Cliente eliminado correctamente." });
  });

  // 5. Fetch all messages
  app.get("/api/messages", (req, res) => {
    res.json(messages);
  });

  // 6. Manual Send (e.g., administrator reply from Live Chat)
  app.post("/api/messages", (req, res) => {
    const { clientId, text, senderName, senderPhone } = req.body;
    if (!clientId || !text) {
      res.status(400).json({ error: "ClientId y Texto son obligatorios" });
      return;
    }

    const linkedClient = clients.find((c) => c.id === clientId);
    if (!linkedClient) {
      res.status(404).json({ error: "Cliente no asociado" });
      return;
    }

    const newMessage: Message = {
      id: crypto.randomUUID(),
      clientId,
      senderName: senderName || "Soporte Agencia IA",
      senderPhone: senderPhone || linkedClient.phone,
      text,
      incoming: false,
      timestamp: new Date().toISOString(),
    };

    messages.push(newMessage);
    saveDatabase();
    broadcast("MESSAGES_UPDATED", messages);
    res.status(201).json(newMessage);
  });

  // 7. Webhook OPTIONS routes
  app.options("/api/webhooks/whatsapp", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.status(200).end();
  });

  // 7.1. Webhook GET routes returning absolute status 200 "Webhook Activo"
  app.get("/api/webhooks/whatsapp", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send("Webhook Activo");
  });

  // 7.2. Shared Webhook POST flexible processor
  const handleWhatsappWebhookPost = async (req: express.Request, res: express.Response) => {
    const event = req.headers["x-webhook-event"] || "";
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    
    res.status(200).send('OK');

    (async () => {
      try {
        const body = req.body || {};
        if (
          event === "whatsapp.message.sent" ||
          event === "whatsapp.message.delivered" ||
          event === "whatsapp.message.read" ||
          body?.message?.kapso?.direction === "outbound"
        ) {
          console.log("[Filtro Kapso] Ignorando mensaje saliente o estado para evitar loop.");
          return;
        }
        
        if (!body.message && !body.conversation) {
          console.log("[Kapso Webhook Async] Estructura desconocida o vacía, ignorando.");
          return;
        }

        console.log("[Kapso Webhook Async] Payload real v2 recibido de forma segura.");

        const text = body.message?.text?.body || body.message?.kapso?.content || "";
        const senderPhoneRaw = body.message?.from || body.conversation?.phone_number || "";
        const cleanSenderPhone = senderPhoneRaw.replace(/[\s\-\+\(\)]/g, "");
        const senderName = body.conversation?.kapso?.contact_name || body.message?.username || "Cliente WhatsApp";
        const phoneId = body.phone_number_id || body.conversation?.phone_number_id || "";

        if (!cleanSenderPhone) {
          console.warn("[Kapso Webhook Async] No se pudo extraer el teléfono del remitente.");
          return;
        }

        let resolvedClient = clients.find((c) => c.phone === cleanSenderPhone);
        if (!resolvedClient) {
          resolvedClient = clients.find((c) => c.phone === "56920403095");
        }

        if (!resolvedClient) {
          console.warn("[Kapso Webhook Async] No se encontró cliente asociado en la base de datos.");
          return;
        }

        console.log(`[Kapso Webhook Async] Procesando mensaje de [${senderName}] para: ${resolvedClient.name}`);

        if (resolvedClient.sheets_url) {
          await postToGoogleSheets(resolvedClient.sheets_url, {
            phone: cleanSenderPhone,
            name: senderName,
            status: "Seguimiento",
            lastMessage: text
          });
        }

        const incomingMsg: Message = {
          id: crypto.randomUUID(),
          clientId: resolvedClient.id,
          senderName: senderName,
          senderPhone: cleanSenderPhone,
          text: text,
          incoming: true,
          timestamp: new Date().toISOString()
        };

        messages.push(incomingMsg);
        try {
          await saveDatabase();
          broadcast("MESSAGES_UPDATED", messages);
        } catch (dbErr) {
          console.error("[Kapso Webhook Async] Error actualizando DB entrante:", dbErr);
        }

        // --- NUEVO: HISTORIAL AMPLIADO A 40 MENSAJES (20 DE CADA LADO) ---
        const conversationHistory = messages
          .filter((m) => m.senderPhone === cleanSenderPhone)
          .slice(-40) // Toma los últimos 40 mensajes totales del historial de este número
          .map((m) => ({
            role: m.incoming ? "user" : "model",
            parts: [{ text: m.text || "" }]
          }));

        const clientObj = resolvedClient;
        let aiResponseText = "";
        try {
          const ai = getGeminiClient(clientObj.gemini_api_key);
          if (!ai) {
            throw new Error("No hay API Key para Gemini.");
          }

          let modelToUse = "gemini-2.5-flash"; 
          const modelStr = (clientObj.ai_model || "").toLowerCase();
          if (modelStr.includes("pro")) {
            modelToUse = "gemini-1.5-pro";
          }

          const aiRes = await ai.models.generateContent({
            model: modelToUse,
            contents: conversationHistory,
            config: {
              systemInstruction: clientObj.system_prompt || "Responder de forma amable y profesional.",
            }
          });

          aiResponseText = aiRes.text || "Lo siento, no he podido procesar una respuesta.";
        } catch (aiErr: any) {
          console.error("[Kapso Webhook Async] Gemini API error (Posible Error 13):", aiErr);
          aiResponseText = `Lo siento, tuvimos un pequeño inconveniente técnico al procesar el mensaje. ¿Me podés repetir lo último?`;
        }

        const KAPSO_API_TOKEN = clientObj.provider_token || process.env.KAPSO_API_TOKEN || "";
        const finalPhoneId = phoneId || clientObj.provider_id || "";

        if (!finalPhoneId) {
          console.error("[Kapso Webhook Async] Falta el phone_number_id para armar la URL del proxy.");
          return;
        }

        const targetUrl = `https://api.kapso.ai/meta/whatsapp/v24.0/${finalPhoneId}/messages`;
        console.log(`[Kapso Webhook Async] Despachando POST al proxy: ${targetUrl}`);

        try {
          const outboundRes = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": KAPSO_API_TOKEN
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: cleanSenderPhone,
              type: "text",
              text: { body: aiResponseText }
            })
          });
          const resText = await outboundRes.text();
          console.log(`[Kapso Webhook Async] Respuesta Proxy Kapso: Status ${outboundRes.status}. Body: ${resText}`);
        } catch (outboundErr: any) {
          console.error("[Kapso Webhook Async] Falló el fetch al proxy de Kapso:", outboundErr);
        }

        const outgoingMsg: Message = {
          id: crypto.randomUUID(),
          clientId: clientObj.id,
          senderName: `AI Bot (${clientObj.ai_model})`,
          senderPhone: cleanSenderPhone,
          text: aiResponseText,
          incoming: false,
          timestamp: new Date().toISOString()
        };

        messages.push(outgoingMsg);
        
        try {
          await saveDatabase();
          broadcast("MESSAGES_UPDATED", messages);
        } catch (dbErr) {
          console.error("[Kapso Webhook Async] Error actualizando DB saliente con memoria:", dbErr);
        }

      } catch (bgError: any) {
        console.error("[Kapso Webhook Async] Error crítico en segundo plano:", bgError.message);
      }
    })();
  };
  
  app.post("/api/webhooks/whatsapp", handleWhatsappWebhookPost);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Agencia IA Admin server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server failure on startup:", err);
});
