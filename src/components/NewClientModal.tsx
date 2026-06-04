/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { X, User, Briefcase, Phone, FileSpreadsheet, Sparkles, ShieldCheck, Layers, Cpu, FileText, Keyboard, Lock, Key } from "lucide-react";
import { Client } from "../types";

interface NewClientModalProps {
  client?: Client; // Optional client to edit
  onClose: () => void;
  onSubmit: (clientData: { 
    name: string; 
    rubro: string; 
    phone: string; 
    sheetsLinked: boolean;
    provider: string;
    provider_token: string;
    webhook_secret: string;
    sheets_url: string;
    payment_mercadopago: string;
    payment_uala_modo: string;
    payment_stripe: string;
    payment_paypal: string;
    gemini_api_key: string;
    ai_model: string;
    system_prompt: string;
  }) => Promise<boolean>;
}

export default function NewClientModal({ client, onClose, onSubmit }: NewClientModalProps) {
  const [name, setName] = useState(client ? client.name : "");
  const [rubro, setRubro] = useState(client ? client.rubro : "Servicios");
  const [phone, setPhone] = useState(client ? `+${client.phone}` : "");
  const [sheetsLinked, setSheetsLinked] = useState(client ? client.sheetsLinked : false);
  const [provider, setProvider] = useState(client ? client.provider : "Kapso IA");
  const [providerToken, setProviderToken] = useState(client ? client.provider_token || "" : "");
  const [webhookSecret, setWebhookSecret] = useState(client ? client.webhook_secret || "" : "");
  const [sheetsUrl, setSheetsUrl] = useState(client ? client.sheets_url || "" : "");
  const [paymentMercadopago, setPaymentMercadopago] = useState(client ? client.payment_mercadopago || "" : "");
  const [paymentUalaModo, setPaymentUalaModo] = useState(client ? client.payment_uala_modo || "" : "");
  const [paymentStripe, setPaymentStripe] = useState(client ? client.payment_stripe || "" : "");
  const [paymentPaypal, setPaymentPaypal] = useState(client ? client.payment_paypal || "" : "");
  const [geminiApiKey, setGeminiApiKey] = useState(client ? client.gemini_api_key || "" : "");

  // Determine if editing model is listed in standard selections or custom
  const fastModels = [
    "Gemini 2.5 Flash (Velocidad y Eficiencia)",
    "Gemini 2.5 Pro (Razonamiento Complejo)",
    "ChatGPT - GPT-4o",
    "Claude 3.5 Sonnet"
  ];
  const initialModel = client ? client.ai_model : "Gemini 2.5 Flash (Velocidad y Eficiencia)";
  const isFastModel = fastModels.includes(initialModel);

  const [aiModel, setAiModel] = useState(isFastModel ? initialModel : "Otro (Escribir modelo personalizado...)");
  const [customModel, setCustomModel] = useState(isFastModel ? "" : initialModel);
  const [systemPrompt, setSystemPrompt] = useState(client ? client.system_prompt : "Responder siempre de forma muy amable, concisa y profesional.");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorWarning, setErrorWarning] = useState("");

  const nameHelper = name; // Clean name without forcing lowercase / dots conversion

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWarning("");

    if (!name.trim()) {
      setErrorWarning("El nombre del cliente es obligatorio");
      return;
    }

    if (name.length < 3) {
      setErrorWarning("El nombre del cliente debe tener al menos 3 caracteres");
      return;
    }

    if (!phone.trim()) {
      setErrorWarning("El número de teléfono WhatsApp es obligatorio");
      return;
    }

    // Basic regex check for numbers (E.164)
    const rawDigits = phone.replace(/[\s\-\+\(\)]/g, "");
    if (rawDigits.length < 6 || !/^\d+$/.test(rawDigits)) {
      setErrorWarning("El formato de teléfono no es válido (solo se permiten dígitos e indicativo)");
      return;
    }

    const finalAiModel = aiModel === "Otro (Escribir modelo personalizado...)" ? customModel.trim() : aiModel;
    if (aiModel === "Otro (Escribir modelo personalizado...)" && !finalAiModel) {
      setErrorWarning("Por favor ingresa el código o ID del modelo personalizado");
      return;
    }

    setIsSubmitting(true);
    try {
      // Automatic username normalization: replace spaces with dots to keep the matching brand aesthetics (e.g. "solucionesia.gustavo")
      const normalizedName = nameHelper;
      
      const success = await onSubmit({
        name: normalizedName,
        rubro,
        phone: rawDigits,
        sheetsLinked,
        provider,
        provider_token: providerToken,
        webhook_secret: webhookSecret,
        sheets_url: sheetsUrl,
        payment_mercadopago: paymentMercadopago,
        payment_uala_modo: paymentUalaModo,
        payment_stripe: paymentStripe,
        payment_paypal: paymentPaypal,
        gemini_api_key: geminiApiKey,
        ai_model: finalAiModel,
        system_prompt: systemPrompt,
      });

      if (success) {
        onClose();
      } else {
        setErrorWarning("Hubo un error del servidor al registrar el comercio.");
      }
    } catch (err: any) {
      setErrorWarning(err.message || "No se pudo realizar el registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-filter backdrop-blur-md flex justify-center items-center p-4 z-50 select-none animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1423] border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Glow bg decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />

        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 md:px-8 pb-5 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-xl text-white tracking-wide">
              {client ? "Editar Comercio / Marca" : "Registrar Nuevo Comercio"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning messages */}
        {errorWarning && (
          <div className="mx-6 md:mx-8 mt-4 p-3 bg-red-950/20 border border-red-900/40 text-red-400 text-xs rounded-xl flex items-center gap-2 animate-shake shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
            <span>{errorWarning}</span>
          </div>
        )}

        {/* Form body - Scrollable section inside modal */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 md:px-8 py-5 space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Nombre de Comercio / Marca
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <input
                type="text"
                placeholder="Ej: Soluciones IA Gustavo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Rubro selection - NEW DROPDOWN OPTION */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Rubro / Categoría de Negocio
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[#111827] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-10 text-sm text-gray-200 outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="" disabled className="bg-[#0e1423] text-gray-500">Seleccionar Rubro...</option>
                {["Servicios", "Gastronomía", "Comercio", "Salud", "Educación", "Inmobiliaria"].map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0e1423] text-gray-200">
                    {cat}
                  </option>
                ))}
              </select>
              {/* Sleek chevron arrow inside selector */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4.5 w-4.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              WhatsApp del Bot (Con Código de País)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <input
                type="text"
                placeholder="Ej: +54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
              />
            </div>
            <p className="text-[10px] text-gray-500">
              Formato internacional E.164. Utilizado para rutear los flujos de mensajería webhook.
            </p>
          </div>

          {/* CONFIGURACIÓN DE CONEXIÓN */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Proveedor de WhatsApp *
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-[#111827] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-10 text-sm text-gray-200 outline-none transition-all cursor-pointer appearance-none"
              >
                {["Kapso IA", "Meta (Oficial API)"].map((prov) => (
                  <option key={prov} value={prov} className="bg-[#0e1423] text-gray-200">
                    {prov}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-4.5 w-4.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* TOKEN DE PROVEEDOR */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Token de Proveedor de WhatsApp *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <input
                type="password"
                placeholder={provider === "Kapso IA" ? "Ej: m_kapso_live_token..." : "Ej: Permanent Access Token de Meta..."}
                value={providerToken}
                onChange={(e) => setProviderToken(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* SECRETO DE WEBHOOK DE KAPSO */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Secreto de Webhook de Kapso *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <input
                type="password"
                placeholder="Ej: whsec_kapso_unique_key..."
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-605 outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* CONFIGURACIÓN DEL CEREBRO DE IA (MOTORES) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Motor de IA *
            </label>
            <div className="relative">
              <Cpu className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-[#111827] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-10 text-sm text-gray-200 outline-none transition-all cursor-pointer appearance-none"
              >
                {[
                  "Gemini 2.5 Flash (Velocidad y Eficiencia)",
                  "Gemini 2.5 Pro (Razonamiento Complejo)",
                  "ChatGPT - GPT-4o",
                  "Claude 3.5 Sonnet",
                  "Otro (Escribir modelo personalizado...)"
                ].map((model) => (
                  <option key={model} value={model} className="bg-[#0e1423] text-gray-200">
                    {model}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-4.5 w-4.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* GOOGLE AI STUDIO KEY */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Google AI Studio Key (Gemini API Key) *
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <input
                type="password"
                placeholder="Ingresa tu Gemini API Key (AIzaSy...)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* CAMPO LIBRE COMPATIBLE PARA MODELO PERSONALIZADO */}
          {aiModel === "Otro (Escribir modelo personalizado...)" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                Código / ID del Modelo *
              </label>
              <div className="relative">
                <Keyboard className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Ej: gpt-4o-mini, deepseek-chat, groq-llama3, etc."
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
                />
              </div>
              <p className="text-[10px] text-gray-500">
                Escribe, copia o pega directamente el ID del modelo para la conexión.
              </p>
            </div>
          )}

          {/* PROMPT PERSONALIZADO */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
              Prompt del Sistema / Instrucciones del Bot
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-500" />
              <textarea
                placeholder="Ingresa de forma detallada las órdenes, tono de voz y directrices para este bot..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors resize-none font-sans"
              />
            </div>
          </div>

          {/* SECCIÓN DE PAGOS */}
          <div className="border-t border-[#ffffff10] pt-4.5 space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
              Pasarelas de Pago Nacionales e Internacionales
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mercado Pago */}
              <div className="space-y-1.55">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest font-mono">
                  Mercado Pago (Access Token)
                </label>
                <input
                  type="password"
                  placeholder="Ej: APP_USR-..."
                  value={paymentMercadopago}
                  onChange={(e) => setPaymentMercadopago(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-2.5 px-3 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
                />
              </div>

              {/* Ualá Bis / Modo / Moldo */}
              <div className="space-y-1.55">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest font-mono">
                  Ualá Bis / Modo / Moldo (Credenciales)
                </label>
                <input
                  type="password"
                  placeholder="Ej: Client Secret / ApiKey..."
                  value={paymentUalaModo}
                  onChange={(e) => setPaymentUalaModo(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-2.5 px-3 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
                />
              </div>

              {/* Stripe */}
              <div className="space-y-1.55">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest font-mono">
                  Stripe (Secret Key)
                </label>
                <input
                  type="password"
                  placeholder="Ej: sk_live_..."
                  value={paymentStripe}
                  onChange={(e) => setPaymentStripe(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-2.5 px-3 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
                />
              </div>

              {/* PayPal */}
              <div className="space-y-1.55">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest font-mono">
                  PayPal (Client ID / Secret)
                </label>
                <input
                  type="password"
                  placeholder="Ej: Client ID : Client Secret"
                  value={paymentPaypal}
                  onChange={(e) => setPaymentPaypal(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 rounded-xl py-2.5 px-3 text-xs text-gray-200 placeholder-gray-600 outline-none transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* Options: Google Sheets toggle linking */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => setSheetsLinked(!sheetsLinked)}
              disabled={isSubmitting}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                sheetsLinked
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                  : "bg-[#11182715] border-gray-800 text-gray-400 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className={`w-5 h-5 ${sheetsLinked ? "text-emerald-400" : "text-gray-500"}`} />
                <div className="text-left">
                  <p className="text-xs font-semibold font-sans">Activar auto-registro en Google Sheets</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Vincular base de leads directamente al iniciar.</p>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${sheetsLinked ? "bg-emerald-400" : "bg-gray-700"}`} />
            </button>

            {sheetsLinked && (
              <div className="space-y-1.5 pt-1.5 animate-fade-in pl-1">
                <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-widest font-mono">
                  URL de la Hoja de Google Sheets
                </label>
                <div className="relative">
                  <FileSpreadsheet className="absolute left-3 top-3.5 w-4.5 h-4.5 text-emerald-500" />
                  <input
                    type="url"
                    placeholder="Ej: https://docs.google.com/spreadsheets/d/1A2B.../edit"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-[#11182740] border border-emerald-900/40 focus:border-emerald-500 rounded-xl py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-650 outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Safe action buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-[#11182760] hover:bg-[#11182790] border border-gray-800 text-gray-300 transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/15"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? "Registrando..." : "Confirmar Alta"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
