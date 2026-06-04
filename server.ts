import express from "express";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// Conexión genérica a Supabase
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Puerto para Render
const PORT = process.env.PORT || 3000;

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

// Dejamos el espacio listo para las partes 2 y 3 aquí abajo...

app.listen(PORT, () => {
    console.log(`🚀 Servidor espejo Meta Puro corriendo en puerto ${PORT}`);
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

        // Pasamos el control a la Parte 3 (Gemini y Google Sheets)...
        // [Aquí engancharemos la función procesarGeminiYResponder]

        return res.sendStatus(200);

    } catch (globalError) {
        console.error("💥 Error crítico en el Webhook de recepción:", globalError);
        return res.sendStatus(500);
    }
});
