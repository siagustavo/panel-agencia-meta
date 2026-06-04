/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, 
  Settings2, 
  FileSpreadsheet, 
  Unplug, 
  Smartphone, 
  Clock, 
  Terminal, 
  Sparkles, 
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Layers,
  Cpu,
  FileText
} from "lucide-react";
import { Client } from "../types";

interface ClientDetailDrawerProps {
  client: Client;
  onClose: () => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onToggleSheets: (id: string, currentStatus: boolean) => void;
  onSendWebhook: (payload: { clientId: string; senderName: string; senderPhone: string; text: string }) => Promise<any>;
  onNavigateToChat: (clientId: string) => void;
}

export default function ClientDetailDrawer({
  client,
  onClose,
  onToggleStatus,
  onToggleSheets,
  onSendWebhook,
  onNavigateToChat,
}: ClientDetailDrawerProps) {
  // Webhook Tester inside drawer
  const [senderName, setSenderName] = useState("Emilio Rivas");
  const [senderPhone, setSenderPhone] = useState("+34 600 112 233");
  const [msgText, setMsgText] = useState("Hola! Deseo cotizar el desarrollo de un bot personalizado para mi rubro");
  const [isSending, setIsSending] = useState(false);
  const [whStatus, setWhStatus] = useState<"idle" | "success" | "error">("idle");
  const [whMessage, setWhMessage] = useState("");

  const handleTestWebhook = async () => {
    if (!senderName.trim() || !senderPhone.trim() || !msgText.trim()) return;

    setIsSending(true);
    setWhStatus("idle");
    setWhMessage("");

    try {
      const result = await onSendWebhook({
        clientId: client.id, // Direct UUID binding
        senderName,
        senderPhone,
        text: msgText,
      });

      if (result.error) {
        setWhStatus("error");
        setWhMessage(result.message || result.error);
      } else {
        setWhStatus("success");
        setMsgText(""); // Clear msg
      }
    } catch (err: any) {
      setWhStatus("error");
      setWhMessage(err.message || "Error al enviar test de webhook.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-filter backdrop-blur-sm flex justify-end z-50 animate-fade-in select-none">
      {/* Click outside backdrop close layer */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Flyout Sheet Panel */}
      <div className="relative w-full max-w-md bg-[#090d16] h-full shadow-2xl border-l border-white/[0.08] flex flex-col justify-between overflow-hidden animate-slide-in">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-emerald-500" />

        {/* Header container */}
        <div className="p-6 border-b border-[#ffffff0a] bg-black/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-display font-bold text-lg text-white">Configuración Avanzada</h3>
              <p className="text-[11px] text-gray-400 font-mono tracking-wider">{client.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable details view */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Metadata */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Ficha del Comercio
            </h4>

            <div className="glass-container p-4.5 rounded-xl space-y-3.5 border border-white/[0.04]">
              {/* ID */}
              <div>
                <span className="text-[9px] text-gray-500 font-mono uppercase">ID ÚNICO DE BASE DE DATOS</span>
                <p className="text-xs text-gray-300 font-mono select-all bg-black/45 px-2 py-1 rounded bg-black/10 mt-1">
                  {client.id}
                </p>
              </div>

              {/* Rubro & Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-gray-500 font-mono uppercase">RUBRO REGISTRADO</span>
                  <p className="text-sm text-gray-200 font-semibold mt-0.5">{client.rubro}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 font-mono uppercase">MODO INSTANCIA</span>
                  <p className="text-sm text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 neon-green-pulse" />
                    Producción
                  </p>
                </div>
              </div>

              {/* Phone Line link */}
              <div>
                <span className="text-[9px] text-gray-500 font-mono uppercase">NÚMERO ASOCIADO (WSP)</span>
                <p className="text-sm text-cyan-400 font-semibold flex items-center gap-1.5 mt-0.5 font-mono">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  +{client.phone}
                </p>
              </div>

              {/* Joined Date */}
              <div>
                <span className="text-[9px] text-gray-500 font-mono uppercase">FECHA DE REGISTRO</span>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {new Date(client.createdAt).toLocaleString()}
                </p>
              </div>

              {/* WhatsApp Provider */}
              <div>
                <span className="text-[9px] text-gray-500 font-mono uppercase font-semibold">PROVEEDOR DE WHATSAPP</span>
                <p className="text-xs text-blue-400 font-semibold flex items-center gap-1.5 mt-1 font-mono">
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  {client.provider || "Kapso IA"}
                </p>
              </div>

              {/* AI Engine Model */}
              <div>
                <span className="text-[9px] text-gray-500 font-mono uppercase font-semibold">MOTOR DE IA (CEREBRO)</span>
                <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mt-1 font-mono">
                  <Cpu className="w-3.5 h-3.5 text-gray-500" />
                  {client.ai_model || "ChatGPT - GPT-4o mini (Económico)"}
                </p>
              </div>

              {/* Bot Prompt Instructions */}
              <div>
                <span className="text-[9px] text-gray-500 font-mono uppercase font-semibold">INSTRUCCIONES / PROMPT DEL BOT</span>
                <div className="text-[11px] text-gray-300 bg-black/35 border border-white/[0.04] p-2.5 rounded-lg mt-1 font-sans max-h-24 overflow-y-auto leading-relaxed select-text">
                  {client.system_prompt || "Responder siempre de forma muy amable, concisa y profesional."}
                </div>
              </div>

              {/* Integraciones Activas */}
              {(client.sheets_url || client.payment_mercadopago || client.payment_uala_modo || client.payment_stripe || client.payment_paypal || client.webhook_secret) && (
                <div className="border-[#ffffff08] border-t pt-3 space-y-2 mt-1">
                  <span className="text-[9px] text-gray-500 font-mono uppercase font-semibold block mb-1">Integraciones y Credenciales</span>
                  <div className="space-y-1 text-[11px] text-gray-300">
                    {client.webhook_secret && (
                      <div className="bg-black/35 p-2 rounded border border-white/[0.03] flex items-center justify-between">
                        <span className="text-gray-400 font-mono text-[9px]">Sec. Webhook Kapso</span>
                        <span className="text-emerald-400 font-mono text-[9px]">✓ Configurado</span>
                      </div>
                    )}
                    {client.sheets_url && (
                      <div className="bg-black/35 p-2 rounded border border-white/[0.03] flex flex-col gap-1">
                        <span className="text-gray-400 font-mono text-[9px]">Google Sheets URL</span>
                        <a href={client.sheets_url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline truncate text-[10px] font-mono">
                          {client.sheets_url}
                        </a>
                      </div>
                    )}
                    {client.payment_mercadopago && (
                      <div className="bg-black/35 p-2 rounded border border-white/[0.03] flex items-center justify-between">
                        <span className="text-gray-400 font-mono text-[9px]">Mercado Pago Token</span>
                        <span className="text-emerald-500 font-mono text-[9px] font-semibold">✓ Conectado</span>
                      </div>
                    )}
                    {client.payment_uala_modo && (
                      <div className="bg-black/35 p-2 rounded border border-white/[0.03] flex items-center justify-between">
                        <span className="text-gray-400 font-mono text-[9px]">Ualá Bis / Modo / Moldo</span>
                        <span className="text-emerald-500 font-mono text-[9px] font-semibold">✓ Conectado</span>
                      </div>
                    )}
                    {client.payment_stripe && (
                      <div className="bg-black/35 p-2 rounded border border-white/[0.03] flex items-center justify-between">
                        <span className="text-gray-400 font-mono text-[9px]">Stripe Key</span>
                        <span className="text-cyan-400 font-mono text-[9px] font-semibold">✓ Conectado</span>
                      </div>
                    )}
                    {client.payment_paypal && (
                      <div className="bg-black/35 p-2 rounded border border-white/[0.03] flex items-center justify-between">
                        <span className="text-gray-400 font-mono text-[9px]">PayPal Key</span>
                        <span className="text-cyan-400 font-mono text-[9px] font-semibold">✓ Conectado</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Controls */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Acciones Rápidas
            </h4>

            <div className="space-y-2">
              {/* Toggle Bot Status Switch */}
              <button
                key="toggle-status"
                onClick={() => onToggleStatus(client.id, client.status)}
                className={`w-full flex items-center justify-between p-4.5 rounded-xl border transition-all cursor-pointer ${
                  client.status
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                    : "bg-gray-900/40 border-gray-800 text-gray-450 hover:bg-gray-800/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${client.status ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
                  <div className="text-left">
                    <p className="text-xs font-semibold font-sans text-gray-100">Instancia Bot de WhatsApp</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Activar o pausar las respuestas automáticas.</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono">{client.status ? "ACTIVO" : "PAUSADO"}</span>
              </button>

              {/* Toggle Google Sheets LINK */}
              <button
                key="toggle-sheets"
                onClick={() => onToggleSheets(client.id, client.sheetsLinked)}
                className={`w-full flex items-center justify-between p-4.5 rounded-xl border transition-all cursor-pointer ${
                  client.sheetsLinked
                    ? "bg-blue-950/20 border-blue-500/30 text-blue-400"
                    : "bg-gray-900/40 border-gray-800 text-gray-450 hover:bg-gray-850/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className={`w-4 h-4 ${client.sheetsLinked ? "text-blue-400" : "text-gray-500"}`} />
                  <div className="text-left">
                    <p className="text-xs font-semibold font-sans text-gray-100">Sincronización Sheets</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Guardar conversaciones en la celda de control.</p>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono">{client.sheetsLinked ? "VINCULADO" : "DESCONECTADO"}</span>
              </button>
            </div>
          </div>

          {/* Targeted Webhook Tester Section */}
          <div className="space-y-4 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                Prueba Webhook WhatsApp
              </h4>
            </div>

            <div className="bg-black/20 p-4 rounded-xl border border-white/[0.03] space-y-3">
              <p className="text-[10px] text-gray-400">
                Simula el arribo de un mensaje cliente para verificar el ruteador de webhook.
              </p>

              {/* Sender Name */}
              <div className="space-y-1">
                <label className="block text-[9px] text-gray-500 font-mono">REMITENTE (CLIENTE NOMBRE)</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-black/45 border border-gray-800 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Sender Phone */}
              <div className="space-y-1">
                <label className="block text-[9px] text-gray-500 font-mono">NÚMERO REMITENTE</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full bg-black/45 border border-gray-800 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Text Message */}
              <div className="space-y-1">
                <label className="block text-[9px] text-gray-500 font-mono">BODY TEXT MENSAJE</label>
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  rows={2}
                  className="w-full bg-black/45 border border-gray-800 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Submit Test Button */}
              <button
                onClick={handleTestWebhook}
                disabled={isSending}
                className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Enviar Test Event</span>
              </button>

              {/* Webhook tester result */}
              {whStatus === "success" && (
                <div className="p-2.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 text-[10px] rounded-lg flex items-center gap-1.5 font-mono">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Procesado correctamente! Visualice el mensaje en la vista Live Chat.</span>
                </div>
              )}

              {whStatus === "error" && (
                <div className="p-2.5 bg-red-950/20 text-red-400 border border-red-900/30 text-[10px] rounded-lg flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Error: {whMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-[#ffffff0a] bg-black/20 flex gap-2">
          <button
            onClick={() => onNavigateToChat(client.id)}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-black transition-colors cursor-pointer text-center"
          >
            Ver Conversación Chat
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl text-xs font-bold bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer text-center"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
