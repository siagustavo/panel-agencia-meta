/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  User, 
  Smartphone, 
  Terminal, 
  CheckCheck, 
  CornerDownLeft, 
  Sparkles,
  Info,
  Layers,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { Client, Message } from "../types";

interface LiveChatProps {
  clients: Client[];
  messages: Message[];
  onSendMessage: (clientId: string, text: string, senderName?: string, senderPhone?: string) => Promise<any>;
  onSendWebhook: (payload: { clientId: string; senderName: string; senderPhone: string; text: string }) => Promise<any>;
}

export default function LiveChat({
  clients,
  messages,
  onSendMessage,
  onSendWebhook,
}: LiveChatProps) {
  // Navigation states
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [typedMessage, setTypedMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Webhook Simulator form state
  const [whClientRef, setWhClientRef] = useState("");
  const [whName, setWhName] = useState("Laura Sanabria");
  const [whPhone, setWhPhone] = useState("+54 9 11 9876-5432");
  const [whText, setWhText] = useState("Hola! Necesito consultar la disponibilidad de turnos");
  const [whIsSending, setWhIsSending] = useState(false);
  
  // Terminal log results
  const [whPayloadSent, setWhPayloadSent] = useState<any>(null);
  const [whRawResponse, setWhRawResponse] = useState<any>(null);
  const [whStatus, setWhStatus] = useState<"idle" | "success" | "error">("idle");
  const [whErrorMessage, setWhErrorMessage] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set default client initially
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
      setWhClientRef(clients[0].name); // Use name or ID for simulation to test resolution!
    }
  }, [clients]);

  // Scroll to bottom when messages or selected client changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedClientId]);

  // Current client
  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  // Messages filtered for current client
  const activeChatMessages = messages.filter((m) => m.clientId === selectedClientId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Handle support message submission
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeClient) return;

    setIsSendingMsg(true);
    try {
      await onSendMessage(activeClient.id, typedMessage);
      setTypedMessage("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingMsg(false);
    }
  };

  // Trigger simulated Kapso/Meta Webhook API
  const handleTriggerWebhook = async () => {
    if (!whClientRef.trim() || !whName.trim() || !whPhone.trim() || !whText.trim()) return;

    setWhIsSending(true);
    setWhStatus("idle");
    setWhErrorMessage("");

    // Look up ID based on name or exact selection
    const chosenClient = clients.find(c => c.name === whClientRef || c.id === whClientRef);
    const resolvedClientId = chosenClient ? chosenClient.id : whClientRef; // If not found, send whatever to test Zod fallback!

    const payload = {
      clientId: resolvedClientId,
      senderName: whName,
      senderPhone: whPhone,
      text: whText,
    };

    setWhPayloadSent(payload);

    try {
      const resData = await onSendWebhook(payload);
      setWhRawResponse(resData);
      
      if (resData.error) {
        setWhStatus("error");
        setWhErrorMessage(resData.message || resData.error);
      } else {
        setWhStatus("success");
        // Clear message input on webhook success
        setWhText("");
      }
    } catch (err: any) {
      setWhStatus("error");
      setWhErrorMessage(err.message || "Error al conectar con el webhook de WhatsApp.");
    } finally {
      setWhIsSending(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden">
      {/* 1. Side column: Clients List in Live Chat */}
      <div className="w-full md:w-80 border-r border-[#ffffff0c] bg-gray-950/40 flex flex-col h-1/3 md:h-full">
        <div className="p-4 pt-10 md:pt-14 border-b border-[#ffffff0c]">
          <h3 className="text-xs font-mono tracking-widest text-cyan-400 uppercase">
            Canales de Comercio
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">Selecciona para filtrar las conversaciones</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {clients.map((client) => {
            const lastMsg = messages
              .filter((m) => m.clientId === client.id)
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            const isActive = client.id === selectedClientId;

            return (
              <button
                key={client.id}
                onClick={() => {
                  setSelectedClientId(client.id);
                  setWhClientRef(client.name);
                }}
                className={`w-full text-left p-3.5 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                  isActive
                    ? "bg-cyan-950/30 border border-cyan-500/20 text-white"
                    : "hover:bg-white/[0.02] border border-transparent text-gray-400"
                }`}
              >
                {/* Status dot avatar */}
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono ${isActive ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20" : "bg-gray-800 text-gray-300"}`}>
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${client.status ? "bg-emerald-400" : "bg-gray-600"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold truncate ${isActive ? "text-cyan-400" : "text-gray-300"}`}>
                      {client.name}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {client.rubro}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 truncate mt-1">
                    {lastMsg ? lastMsg.text : "Sin conversaciones activas"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Central Section: Chat room log */}
      <div className="flex-1 flex flex-col bg-gray-950/20 h-2/3 md:h-full">
        {activeClient ? (
          <>
            {/* Active partner topbar header */}
            <div className="px-6 py-4 pt-10 md:pt-14 border-b border-[#ffffff0c] flex items-center justify-between bg-black/10 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-900/30 border border-cyan-500/20">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide">{activeClient.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-cyan-300 font-mono">+{activeClient.phone}</span>
                    <span className="text-[10px] text-gray-500">•</span>
                    <span className={`text-[10px] font-semibold tracking-wider font-mono px-2 py-0.2 rounded-full ${activeClient.status ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/50" : "bg-gray-900 text-gray-400 border border-gray-800"}`}>
                      {activeClient.status ? "MÓDULO ACTIVO" : "MÓDULO INACTIVO"}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Badge */}
              <div className="hidden lg:flex items-center gap-2 p-2 rounded-xl bg-[#ffffff03] border border-[#ffffff05] text-[11px] text-gray-400 font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-500" />
                <span>ID: {activeClient.id.substring(0, 8)}...</span>
              </div>
            </div>

            {/* Scrollable messages container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeChatMessages.length > 0 ? (
                activeChatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${
                      msg.incoming ? "mr-auto items-start" : "ml-auto items-end"
                    }`}
                  >
                    {/* Meta labels sender name */}
                    <span className="text-[10px] text-gray-500 font-medium mb-1 px-1">
                      {msg.incoming ? `${msg.senderName} (${msg.senderPhone})` : "Asistente IA Bot"}
                    </span>

                    {/* Bubble body */}
                    <div
                      className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.incoming
                          ? "bg-gray-900 text-gray-100 rounded-tl-none border border-gray-800"
                          : "bg-gradient-to-br from-cyan-950/80 to-blue-950/80 text-cyan-100 rounded-tr-none border border-cyan-600/20"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Time indicator */}
                    <span className="text-[9px] text-gray-500 font-mono mt-1 px-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-gray-900/50 flex items-center justify-center text-gray-600 border border-gray-800 mb-4 animate-bounce">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <h4 className="text-gray-300 font-semibold text-lg">Sin mensajes previos</h4>
                  <p className="text-sm text-gray-500 max-w-sm mt-1">
                    Este cliente aún no ha recibido payloads de WhatsApp. Utilice el simulador de webhooks en la sección derecha para probar la integración y ver la actualización instantánea.
                  </p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Reply Form */}
            <form onSubmit={handleSendResponse} className="p-4 border-t border-[#ffffff0c] bg-black/10 flex gap-3">
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder={`Responder en el canal de ${activeClient.name}...`}
                disabled={isSendingMsg}
                className="flex-1 bg-[#11182760] border border-gray-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isSendingMsg || !typedMessage.trim()}
                className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Enviar</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Ningún comercio seleccionado
          </div>
        )}
      </div>

      {/* 3. Right Sidebar Panel: Webhooks Meta Simulator and Zod schemas terminal */}
      <div className="w-full md:w-96 border-l border-[#ffffff0c] bg-[#030712] flex flex-col h-1/2 md:h-full">
        {/* Simulator title */}
        <div className="p-4.5 pt-10 md:pt-14 border-b border-[#ffffff0c] bg-black/20">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-bold text-sm text-white tracking-widest uppercase">
              Webhooks & Metadatos
            </h3>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Simulador de payloads entrantes de WhatsApp (Kapso/Meta API).
          </p>
        </div>

        {/* Form panel body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3.5 bg-gray-950/20 p-4 rounded-xl border border-[#ffffff05]">
            <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase block">
              1. Configurar Solicitud Webhook
            </span>

            {/* Client ref matcher */}
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold">CLIENTE (UUID o Comercio Name)</label>
              <select
                value={whClientRef}
                onChange={(e) => setWhClientRef(e.target.value)}
                className="w-full bg-[#11182790] border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300 outline-none focus:border-cyan-500 font-mono"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.name} className="bg-gray-950 text-gray-300 text-xs">
                    {c.name} (UUID resolver)
                  </option>
                ))}
                <option value="invalid-uuid-random-mismatch" className="bg-gray-950 text-red-400 text-xs">
                  Probar error: UUID Inválido
                </option>
                <option value="test_user_no_associated" className="bg-gray-950 text-amber-400 text-xs text-xs">
                  Probar error: Cliente No Registrado
                </option>
              </select>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold">REMITENTE (SENDER NAME)</label>
              <input
                type="text"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                placeholder="Ej: Marcelo Torres"
                className="w-full bg-[#11182790] border border-gray-800 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold">TELÉFONO (TEXT - SE NORMALIZARÁ)</label>
              <input
                type="text"
                value={whPhone}
                onChange={(e) => setWhPhone(e.target.value)}
                placeholder="Ej: +54 9 11 3456-7890"
                className="w-full bg-[#11182790] border border-gray-800 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Message payload */}
            <div className="space-y-1">
              <label className="block text-[10px] text-gray-400 font-semibold font-sans">TEXTO (WHATSAPP BODY)</label>
              <textarea
                value={whText}
                onChange={(e) => setWhText(e.target.value)}
                rows={2}
                placeholder="Escribe el mensaje entrante que procesará el bot..."
                className="w-full bg-[#11182790] border border-gray-800 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-cyan-500"
              />
            </div>

            {/* Trigger actions */}
            <button
              onClick={handleTriggerWebhook}
              disabled={whIsSending}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>Ejecutar Webhook API</span>
            </button>
          </div>

          {/* Real-time Webhook Payload Monitor Terminal */}
          <div className="bg-black/40 border border-[#ffffff08] rounded-xl p-3 space-y-3 font-mono text-[11px] select-all relative overflow-hidden">
            <span className="text-[10px] text-gray-400 block border-b border-[#ffffff05] pb-1">
              🖥️ Monitoreador de Payload Webhook
            </span>

            {whPayloadSent ? (
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-cyan-400">POST /api/webhook/whatsapp</p>
                  <pre className="text-[10px] text-gray-400 bg-black/55 p-2 rounded max-h-40 overflow-y-auto mt-1 leading-normal text-xs font-mono scrollbar-none">
                    {JSON.stringify(whPayloadSent, null, 2)}
                  </pre>
                </div>

                {/* Status indicator */}
                <div className="pt-2 border-t border-[#ffffff05]">
                  <p className="text-[10px] text-gray-400">RESPUESTA DEL SERVIDOR (ZOD VALIDADO):</p>
                  
                  {whStatus === "success" && whRawResponse && (
                    <div className="mt-1 p-2 bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 rounded flex items-start gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[10px]">HTTP 200 OK (Mensaje Correcto)</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">ID guardado del mensaje: {whRawResponse.data?.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  )}

                  {whStatus === "error" && (
                    <div className="mt-1 p-2 bg-red-950/30 text-red-400 border border-red-900/40 rounded flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[10px]">HTTP {whErrorMessage.includes("esquema") || whErrorMessage.includes("Zod") || whErrorMessage.includes("no corresponde") ? 400 : 404} BAD REQUEST</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 whitespace-pre-wrap">{whErrorMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-gray-550 italic py-2 text-center text-gray-500">
                Esperando envío de webhook para inspeccionar carga útil...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
