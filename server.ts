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
