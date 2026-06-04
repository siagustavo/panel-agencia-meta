/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  ArrowUpRight, 
  CheckCircle, 
  Settings2, 
  Database,
  Unplug,
  Zap,
  Phone,
  HelpCircle,
  Pencil,
  Trash2,
  Copy,
  Check
} from "lucide-react";
import { Client } from "../types";

interface ClientDashboardProps {
  clients: Client[];
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onToggleSheets: (id: string, currentStatus: boolean) => void;
  onOpenNewClientModal: () => void;
  onSelectClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientDashboard({
  clients,
  onToggleStatus,
  onToggleSheets,
  onOpenNewClientModal,
  onSelectClient,
  onEditClient,
  onDeleteClient,
}: ClientDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [copied, setCopied] = useState(false);

  const rawUrl = typeof window !== "undefined" ? window.location.origin : "";
  // Sustituir el subdominio -dev- por -pre- para generar la URL pública de producción del proyecto que no requiere IAP/login y evita el error 403.
  const publicOrigin = rawUrl.includes("-dev-") 
    ? rawUrl.replace("-dev-", "-pre-") 
    : rawUrl || "https://tu-app.lovable.app";

  const webhookUrl = `${publicOrigin}/api/webhooks/whatsapp`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter clients based on search and rubro
  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.rubro.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.phone.includes(searchQuery);
    
    const matchesCategory = categoryFilter === "Todos" || client.rubro === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Unique categories (Rubros) for filters
  const categories = ["Todos", ...Array.from(new Set(clients.map((c) => c.rubro)))];

  // Quick Stats
  const totalClients = clients.length;
  const activeBots = clients.filter((c) => c.status).length;
  const linkedSheets = clients.filter((c) => c.sheetsLinked).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-10 md:pt-14 pb-12 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#ffffff10]">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight text-white flex items-center gap-2">
            Panel de clientes
          </h2>
          <p className="text-sm text-gray-400 mt-1.5 font-sans">
            Gestión de comercios de la agencia y estado de sus bots de WhatsApp en producción.
          </p>
        </div>

        {/* High-Contrast Action Button: + Nuevo cliente */}
        <button
          onClick={onOpenNewClientModal}
          id="btn-add-client"
          className="btn-electric-metallic flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-semibold text-base transition-all duration-300 uppercase tracking-wide border border-cyan-400/20"
        >
          <Plus className="w-5 h-5 text-white stroke-[2.5]" />
          <span>+ Nuevo cliente</span>
        </button>
      </div>

      {/* KPI Stats Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-container p-6 rounded-2xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Comercios Totales</span>
            <p className="text-3xl font-display font-bold text-white">{totalClients}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center">
            <Database className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <div className="glass-container p-6 rounded-2xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Instancias Activas</span>
            <p className="text-3xl font-display font-bold text-emerald-400">{activeBots} <span className="text-xs text-gray-500 font-sans font-normal">online</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="glass-container p-6 rounded-2xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl" />
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Hojas de Cálculo</span>
            <p className="text-3xl font-display font-bold text-blue-400">
              {linkedSheets} <span className="text-xs text-gray-500 font-sans font-normal">/{totalClients}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/40 border border-blue-500/20 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* URL de Webhook de Producción - Solo Lectura */}
      <div className="glass-container p-6 rounded-2xl border border-cyan-500/10 relative overflow-hidden bg-gradient-to-r from-cyan-950/15 via-[#0e1423] to-[#0a0e1a] shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 md:max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 neon-blue-pulse" />
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">
                URL de Webhook Pública Recomendada para Kapso
              </h4>
            </div>
            <p className="text-gray-400 text-xs">
              Copia esta URL y configúrala en tu panel o instancia de Kapso IA para recibir y responder de inmediato todos los mensajes entrantes de WhatsApp en tiempo real. No requiere variables globales de backend secundarias.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 border border-gray-800 rounded-xl p-1.5 pl-4 w-full md:max-w-md">
            <span className="text-gray-500 font-mono text-xs select-none pr-1">POST</span>
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="bg-transparent text-gray-200 text-xs font-mono outline-none select-all flex-1 min-w-0"
              title="Haz clic para seleccionar"
            />
            <button
              onClick={handleCopyWebhook}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                copied 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                  : "bg-gray-950 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por comercio, rubro o canal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#11182740] border border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none transition-all"
          />
        </div>

        {/* Rubro Tabs */}
        <div className="flex gap-1.5 self-start md:self-auto overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all select-none whitespace-nowrap cursor-pointer ${
                categoryFilter === cat
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                  : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Clients Table / Card List */}
      <div className="glass-container rounded-2xl overflow-hidden border border-[#ffffff10]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#11182760] text-gray-400 text-xs font-mono uppercase tracking-wider">
                <th id="th-comercio" className="py-4.5 px-6 font-semibold select-none">Comercio</th>
                <th id="th-rubro" className="py-4.5 px-6 font-semibold select-none">Rubro</th>
                <th id="th-modo" className="py-4.5 px-6 font-semibold select-none">Modo</th>
                <th id="th-bot-activo" className="py-4.5 px-6 font-semibold text-center select-none">Bot Activo</th>
                <th className="py-4.5 px-6 font-semibold text-right select-none">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr 
                    key={client.id}
                    className="group bg-transparent hover:bg-white/[0.02] transition-colors"
                  >
                    {/* COMERCIO CELL */}
                    <td className="py-5 px-6 vertical-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors text-base">
                          {client.name}
                        </span>
                        
                        {/* Sheets indicator */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {client.sheetsLinked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSheets(client.id, true);
                              }}
                              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                              title="Haga clic para desvincular Google Sheets"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span className="underline decoration-dotted underline-offset-2">🔗 Google Sheets vinculado</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSheets(client.id, false);
                              }}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer"
                              title="Haga clic para vincular Google Sheets"
                            >
                              <Unplug className="w-3.5 h-3.5" />
                              <span className="underline decoration-dotted underline-offset-2">Sheets desvinculado</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* RUBRO CELL */}
                    <td className="py-5 px-6 vertical-middle">
                      <span className="inline-block px-3 py-1 bg-[#1f293780] text-[#cbd5e1] text-xs font-medium rounded-full border border-gray-800 tracking-wide">
                        {client.rubro}
                      </span>
                    </td>

                    {/* MODO CELL */}
                    <td className="py-5 px-6 vertical-middle">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/40 text-emerald-300 text-xs font-semibold rounded-full border border-emerald-900/60 tracking-wider font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 neon-green-pulse"></span>
                        PRODUCCIÓN
                      </span>
                    </td>

                    {/* BOT ACTIVO SWITCH TOGGLE CELL */}
                    <td className="py-5 px-6 text-center vertical-middle">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => onToggleStatus(client.id, client.status)}
                          className="relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none"
                          style={{
                            backgroundColor: client.status ? "#10b981" : "#374151",
                            boxShadow: client.status 
                              ? "0 0 12px rgba(16, 185, 129, 0.4)" 
                              : "none"
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                            style={{
                              transform: client.status ? "translateX(24px)" : "translateX(0px)"
                            }}
                          />
                        </button>
                      </div>
                    </td>

                    {/* ACTIONS BUTTON CELL */}
                    <td className="py-5 px-6 text-right vertical-middle font-sans">
                      <div className="flex items-center justify-end gap-2 px-1 animate-fade-in">
                        {/* Show phone linked */}
                        <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500 font-mono mr-2">
                          <Phone className="w-3.5 h-3.5 text-gray-500" />
                          <span>+{client.phone}</span>
                        </div>

                        {/* EDIT BUTTON (Pencil) */}
                        <button
                          onClick={() => onEditClient(client)}
                          className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-amber-400 hover:border-amber-500/40 rounded-lg transition-all cursor-pointer"
                          title="Modificar datos de bot/comercio"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* DELETE BUTTON (Trash Can) */}
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás completamente seguro de que deseas eliminar el comercio "${client.name}"? Esta acción es irreversible.`)) {
                              onDeleteClient(client.id);
                            }
                          }}
                          className="p-2 bg-gray-900 border border-gray-800 text-red-500/80 hover:text-red-400 hover:border-red-500/40 rounded-lg transition-all cursor-pointer font-bold"
                          title="Eliminar bot por completo de la lista"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>

                        {/* DETAIL FLYOUT BUTTON */}
                        <button
                          onClick={() => onSelectClient(client)}
                          className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40 rounded-lg transition-all cursor-pointer"
                          title="Ver detalle y probar Webhook"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-gray-950 flex items-center justify-center text-gray-600 mx-auto">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <p className="text-gray-300 font-medium">Ningún cliente coincide</p>
                      <p className="text-xs text-gray-500">
                        Intente ajustar los términos o crear un "+ Nuevo cliente" destacado en la parte superior.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
