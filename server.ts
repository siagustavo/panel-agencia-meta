import express from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const app = express();
app.use(express.json());

// Conexión genérica a Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Puerto para Render
const PORT = process.env.PORT || 3000;


/**
 * 0. REGISTRO DE NUEVO COMERCIO (Puente del WABA ID)
 * ¡VA ACÁ ARRIBA PARA QUE EL ASTERISCO NO LO PISE!
 */
app.post("/api/registrar-comercio", async (req: express.Request, res: express.Response) => {
    try {
        const { nombre, webhook_secret, token, phone_number_id } = req.body;
        const bot_phone_id = webhook_secret;

        if (!bot_phone_id || !/^\d+$/.test(bot_phone_id)) {
            return res.status(400).json({
                error: "El ID de WABA debe contener únicamente caracteres numéricos.",
            });
        }

        // Guardamos en la base de datos
        const { data, error } = await supabase
            .from("bots_config")
            .insert([
                {
                    client_name: nombre,
                    bot_phone_id: bot_phone_id,
                    active: true,
                    conversations_used: 0,
                    conversations_limit: 1000,
                    ai_provider: "gemini",
                    ai_model: "gemini-2.5-flash",
                    system_prompt: "Responder de forma concisa, amable y profesional.",
                    bot_type: "text_service"
                }
            ])
            .select();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // LE DEVOLVEMOS A LA PANTALLA EL JSON EXACTO QUE PIDE PARA QUE SE CIERRE
        return res.status(200).json({
            success: true,
            id: bot_phone_id,
            nombre: nombre,
            token: token || "",
            webhook_secret: bot_phone_id,
            phone_number_id: phone_number_id || ""
        });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// IMPORTANTE: Vite pone los archivos finales en una carpeta 'dist'
const distPath = path.resolve(process.cwd(), "dist"); 
app.use(express.static(distPath));

/**
 * 1. VALIDACIÓN DEL WEBHOOK DE META (Apretón de manos)
 */
app.get("/webhook", (req: express.Request, res: express.Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "token_secreto_agencia";

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("✅ WEBHOOK VALIDADO CON META EXITOSAMENTE");
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.sendStatus(400);
});

/**
 * 2. RECEPTOR DE MENSAJES Y CONTADOR DE CONVERSACIONES (24 HORAS)
 */
app.post("/webhook", async (req: express.Request, res: express.Response) => {
    try {
        const body = req.body;

        // Verificar que sea un evento de la API de WhatsApp
        if (!body.object || body.object !== "whatsapp_business_account") {
            return res.sendStatus(404);
        }

        // Validar que contenga mensajes
        if (!body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
            return res.sendStatus(200); // Confirmamos recepción a Meta aunque venga vacío
        }

        const changeValue = body.entry[0].changes[0].value;
        const message = changeValue.messages[0];
        const metadata = changeValue.metadata;

        const customerPhone = message.from; // Número del cliente que escribe
        const botPhoneId = metadata.phone_number_id; // ID del teléfono que recibe (Genérico)
        
        // Extraer el texto del mensaje
        let userText = "";
        if (message.type === "text") {
            userText = message.text.body;
        } else if (message.type === "button") {
            userText = message.button.text;
        } else {
            return res.sendStatus(200); // Ignoramos multimedia por ahora para no saturar
        }

        console.log(`📩 Mensaje recibido de ${customerPhone}: "${userText}"`);

        // --- CONTROL DE CLIENTES Y CONTROL DE PAGO ---
        // Buscamos en Supabase si este botPhoneId está registrado y activo
        const { data: botConfig, error: botError } = await supabase
            .from("bots_config")
            .select("*")
            .eq("bot_phone_id", botPhoneId)
            .single();

        if (botError || !botConfig) {
            console.log(`⚠️ Bot con ID ${botPhoneId} no configurado en Supabase.`);
            return res.sendStatus(200);
        }

        // Si el dueño del bot no pagó o está desactivado, se frena el servicio
        if (!botConfig.active) {
            console.log(`❌ El bot de ${botConfig.client_name} está desactivado por falta de pago o mantenimiento.`);
            return res.sendStatus(200);
        }

        // --- CONTADOR INTELIGENTE DE CONVERSACIONES (VENTANA DE 24 HS) ---
        const ahora = new Date();
        
        // Buscar si este usuario ya tiene una sesión abierta con este bot
        const { data: session, error: sessionError } = await supabase
            .from("bot_sessions")
            .select("*")
            .eq("bot_phone_id", botPhoneId)
            .eq("customer_phone", customerPhone)
            .single();

        let nuevaConversacion = false;

        if (!session) {
            // Primera vez que habla: nueva conversación de 24 horas
            nuevaConversacion = true;
            const vencimiento24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

            await supabase.from("bot_sessions").insert([
                {
                    bot_phone_id: botPhoneId,
                    customer_phone: customerPhone,
                    start_time: ahora.toISOString(),
                    expire_time: vencimiento24h.toISOString()
                }
            ]);
        } else {
            // Verificar si la ventana de 24 horas ya venció
            const expireTime = new Date(session.expire_time);
            if (ahora > expireTime) {
                nuevaConversacion = true;
                const nuevoVencimiento = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

                // Actualizamos la sesión con la nueva ventana de 24 horas
                await supabase
                    .from("bot_sessions")
                    .update({
                        start_time: ahora.toISOString(),
                        expire_time: nuevoVencimiento.toISOString()
                    })
                    .eq("id", session.id);
            }
        }

        // Si es una nueva ventana de 24 horas, sumamos 1 conversación al cliente
        if (nuevaConversacion) {
            console.log(`🪙 Nueva conversación de 24hs detectada para el cliente ${customerPhone}. Sumando al contador.`);
            
            // Lógica interna para descontar del límite mensual del cliente (Ej: 1000 gratis)
            await supabase
                .from("bots_config")
                .update({ 
                    conversations_used: (botConfig.conversations_used || 0) + 1 
                })
                .eq("bot_phone_id", botPhoneId);
        }

        // Validar si el cliente superó su límite de interacciones contratadas
        if (botConfig.conversations_used >= botConfig.conversations_limit) {
            console.log(`🛑 Cliente ${botConfig.client_name} alcanzó el límite de conversaciones de su plan.`);
            return res.sendStatus(200);
        }

        // Llamamos al motor pensante y ejecutor de Meta
        await procesarGeminiYResponder(customerPhone, userText, botConfig, botPhoneId); 

    } catch (globalError) {
        console.error("💥 Error crítico en el Webhook de recepción:", globalError);
        return res.sendStatus(500);
    }
});

/**
 * 3. MOTOR INTELIGENTE MULTI-MODELO Y MULTI-RUBRO
 */
async function procesarGeminiYResponder(
  customerPhone: string,
  userText: string,
  botConfig: any,
  botPhoneId: string
): Promise<void> {
  try {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const detectedEmails = userText.match(emailRegex);

    if (detectedEmails && detectedEmails.length > 0) {
      const emailExtraido = detectedEmails[0];
      try {
        console.log(`[Lead Tracker] Capturando lead potencial para el rubro: ${botConfig?.client_name || 'Genérico'}`);
        await supabase.from('leads_seguimiento').upsert(
          {
            customer_phone: customerPhone,
            bot_phone_id: botPhoneId,
            email: emailExtraido,
            status: 'Interesado',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'customer_phone,bot_phone_id' }
        );
      } catch (upsertErr: any) {
        console.error('[Lead Tracker] No se pudo persistir el seguimiento del lead:', upsertErr.message);
      }
    }

    let chatHistory: any[] = [];
    try {
      const { data: record, error: fetchError } = await supabase
        .from('bot_chat_history')
        .select('messages')
        .eq('customer_phone', customerPhone)
        .eq('bot_phone_id', botPhoneId)
        .maybeSingle();

      if (fetchError) {
        console.warn('[History Sync] Error buscando historial previo:', fetchError.message);
      } else if (record && Array.isArray(record.messages)) {
        chatHistory = record.messages;
      }
    } catch (historyErr: any) {
      console.warn('[History Sync] Error atrapado en fetch de historial:', historyErr.message);
    }

    chatHistory.push({ role: 'user', content: userText });

    const aiProvider = (botConfig?.ai_provider || 'gemini').toLowerCase();
    const aiModel = botConfig?.ai_model || 'gemini-2.5-flash';
    const systemPrompt = botConfig?.system_prompt || 'Responder de forma concisa, amable y profesional.';
    const botType = botConfig?.bot_type || 'text_service';

    let generatedText = '';
    let generatedImageUrl = '';

    if (botType === 'image_generator') {
      try {
        const openaiApiKey = process.env.OPENAI_API_KEY || '';
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: aiModel.includes('dall-e-3') ? 'dall-e-3' : 'dall-e-2',
            prompt: userText,
            n: 1,
            size: aiModel.includes('dall-e-3') ? '1024x1024' : '512x512'
          })
        });
        const imgData: any = await response.json();
        generatedImageUrl = imgData?.data?.[0]?.url || '';

        if (!generatedImageUrl) {
          throw new Error('No se pudo resolver una URL de imagen válida del proveedor.');
        }
      } catch (imgErr: any) {
        console.error('[AI Image Engine] Error:', imgErr.message);
        generatedText = `Lo siento, experimenté dificultades técnicas al recrear tu imagen: ${imgErr.message}`;
      }
    } else {
      if (aiProvider === 'gemini') {
        const geminiApiKey = process.env.GEMINI_API_KEY || '';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${geminiApiKey}`;

        const formattedContents = chatHistory.map((item) => ({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content }]
        }));

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API retornó código HTTP ${response.status}: ${errText}`);
        }

        const data: any = await response.json();
        generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      } else if (aiProvider === 'anthropic' || aiProvider === 'claude') {
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
        const parsedHistory = chatHistory.map((item) => ({
          role: item.role === 'user' ? 'user' : 'assistant',
          content: item.content
        }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: aiModel,
            system: systemPrompt,
            messages: parsedHistory,
            max_tokens: 1024
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Anthropic API retornó código HTTP ${response.status}: ${errText}`);
        }

        const data: any = await response.json();
        generatedText = data?.content?.[0]?.text || '';

      } else {
        const openaiApiKey = process.env.OPENAI_API_KEY || '';
        const openaiMessages = [
          { role: 'system', content: systemPrompt },
          ...chatHistory.map((item) => ({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.content
          }))
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: aiModel,
            messages: openaiMessages
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenAI API retornó código HTTP ${response.status}: ${errText}`);
        }

        const data: any = await response.json();
        generatedText = data?.choices?.[0]?.message?.content || '';
      }
    }

    if (!generatedText && !generatedImageUrl) {
      generatedText = 'Disculpa la molestia, pero me ha sido imposible procesar una respuesta en este momento.';
    }

    const aiAnswerLabel = generatedImageUrl
      ? `[Imagen Generada por IA]: ${generatedImageUrl}`
      : generatedText;

    chatHistory.push({ role: 'model', content: aiAnswerLabel });

    try {
      await supabase.from('bot_chat_history').upsert(
        {
          customer_phone: customerPhone,
          bot_phone_id: botPhoneId,
          messages: chatHistory,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'customer_phone,bot_phone_id' }
      );
    } catch (upsertHistErr: any) {
      console.error('[History Sync Error] Falló el guardado del historial:', upsertHistErr.message);
    }

    const metaAccessToken = process.env.META_ACCESS_TOKEN || '';
    const metaUrl = `https://graph.facebook.com/v17.0/${botPhoneId}/messages`;

    let payload: any = {};

    if (botType === 'image_generator' && generatedImageUrl) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: customerPhone,
        type: 'image',
        image: {
          link: generatedImageUrl,
          caption: `Aquí tienes tu diseño generado para: "${userText}"`
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: customerPhone,
        type: 'text',
        text: {
          body: generatedText
        }
      };
    }

    console.log(`[Meta WhatsApp Outbound] Despachando mensaje saliente a ${customerPhone}`);
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${metaAccessToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!metaResponse.ok) {
      const metaErrText = await metaResponse.text();
      console.error(`[Meta API Error] Error al despachar el mensaje: Status ${metaResponse.status}`, metaErrText);
    } else {
      console.log(`[Meta WhatsApp Outbound] Mensaje despachado exitosamente.`);
    }

  } catch (error: any) {
    console.error('[procesarGeminiYResponder] Falló el procesamiento del flujo asincrónico:', error.message || error);
  }
}
app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
});
// Escucha del servidor al final de todo el archivo para evitar bloqueos
app.listen(PORT, () => {
    console.log(`🚀 Servidor espejo Meta Puro corriendo en puerto ${PORT}`);
});
