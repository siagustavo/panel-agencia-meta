import React, { useState, useEffect } from "react";
import {
  Plus,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  User,
  Phone,
  Shield,
  Key,
  FileSpreadsheet,
  Mail,
  BarChart,
  Bot,
  Layers,
  AlertTriangle
} from "lucide-react";

interface Probador {
  id: string;
  client_name: string;
  customer_phone: string;
  access_code: string;
  system_prompt: string;
  gemini_api_key: string;
  sheet_id?: string;
  is_active: boolean;
  message_limit: number;
  message_count: number;
  email?: string;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [probadores, setProbadores] = useState<Probador[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    client_name: "",
    customer_phone: "",
    access_code: "",
    system_prompt: "",
    gemini_api_key: "",
    sheet_id: "",
    message_limit: 100,
    email: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProbadores = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/probadores`);
      if (!response.ok) throw new Error("Fallo al consultar los probadores.");
      const data = await response.json();
      setProbadores(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProbadores();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Si es el campo de teléfono, limpiamos todo lo que no sea número en tiempo real
    if (name === "customer_phone") {
      const cleaned = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/probadores/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (response.ok) {
        setProbadores((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
        );
      }
    } catch (err) {
      console.error("Error al actualizar estado del probador", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validación: Correo removido de los campos obligatorios (ahora es opcional)
    if (
      !formData.client_name ||
      !formData.customer_phone ||
      !formData.access_code ||
      !formData.system_prompt ||
      !formData.gemini_api_key
    ) {
      setErrorMsg("Por favor, complete todos los campos obligatorios (*).");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/registrar-probador`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Error al realizar el registro.");
      }

      setSuccessMsg("Probador registrado de manera correcta e iniciado.");
      setFormData({
        client_name: "",
        customer_phone: "",
        access_code: "",
        system_prompt: "",
        gemini_api_key: "",
        sheet_id: "",
        message_limit: 100,
        email: "",
      });
      fetchProbadores();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error inesperado.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30">
              <Bot className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                PROBOT-HUB
              </span>
              <span className="text-xs block text-slate-400 font-medium">Línea Maestro Meta: +54 9 2241 61-8419</span>
            </div>
          </div>
          <button
            onClick={fetchProbadores}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refrescar Panel</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Informativo */}
        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-6 flex items-start space-x-4">
          <Layers className="w-8 h-8 text-indigo-400 shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-indigo-200">Panel de Activación Rápida de Demos</h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Ingresá manualmente el número del cliente para dejarlo atado a su entorno de testeo. Cuando ese número específico escriba a tu línea maestra, el motor aislará su flujo usando sus propias llaves de Gemini y sus directivas personalizadas, descontando mensajes de su cuota fija.
            </p>
          </div>
        </div>

        {/* Formulario y Tabla de Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Formulario de registro */}
          <section className="lg:col-span-4 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
            <div className="border-b border-slate-800/80 pb-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Alta de Probador Manual
              </h3>
              <p className="text-xs text-slate-400 mt-1">Vinculación inmediata del celular del cliente.</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Nombre del Negocio / Cliente *
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleInputChange}
                  placeholder="Ej. Carnicería Don Fer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp del Probador (Sin +, solo números) *
                </label>
                <input
                  type="text"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  placeholder="Ej. 5491122334455"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Código Interno / Token de Control *
                </label>
                <input
                  type="text"
                  name="access_code"
                  value={formData.access_code}
                  onChange={handleInputChange}
                  placeholder="Ej. PROB-CARNE"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> Gemini API Key (Su Cerebro) *
                </label>
                <input
                  type="password"
                  name="gemini_api_key"
                  value={formData.gemini_api_key}
                  onChange={handleInputChange}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Google Sheet Script ID (Opcional)
                </label>
                <input
                  type="text"
                  name="sheet_id"
                  value={formData.sheet_id}
                  onChange={handleInputChange}
                  placeholder="ID de la hoja de cálculo..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BarChart className="w-3.5 h-3.5 text-slate-400" /> Límite de Mensajes Permitidos
                </label>
                <input
                  type="number"
                  name="message_limit"
                  value={formData.message_limit}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Correo electrónico de Seguimiento (Opcional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="correo@opcional.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">System Prompt del Negocio *</label>
                <textarea
                  name="system_prompt"
                  value={formData.system_prompt}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Ej: Sos el bot de una carnicería. Responde con buena onda, ofrece asado los viernes y..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-2 px-4 rounded-xl text-sm shadow-lg shadow-indigo-500/10 transition-all duration-200 mt-2"
              >
                Activar y Vincular Probador
              </button>
            </form>
          </section>

          {/* Tabla de administración */}
          <section className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/20 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100">Simuladores en Curso</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Monitoreo en vivo de los clientes testeando.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 text-xs uppercase bg-slate-950/20">
                      <th className="px-6 py-3.5 font-semibold">Cliente / Probador</th>
                      <th className="px-6 py-3.5 font-semibold">Teléfono Enlazado</th>
                      <th className="px-6 py-3.5 font-semibold">Consumo / Corte Automático</th>
                      <th className="px-6 py-3.5 font-semibold text-center">Bot Activo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {probadores.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-500 text-xs">
                          No hay ningún probador activo en este momento.
                        </td>
                      </tr>
                    ) : (
                      probadores.map((p) => {
                        const usagePercentage = Math.min(
                          (p.message_count / p.message_limit) * 100,
                          100
                        );
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/20 transition-all">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-200">{p.client_name}</div>
                              {p.email && <div className="text-xs text-slate-500 mt-0.5">{p.email}</div>}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-indigo-400">
                              +{p.customer_phone}
                            </td>
                            <td className="px-6 py-4 space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-400">
                                <span className="font-medium">{p.message_count} consumidos</span>
                                <span className="font-semibold text-slate-500">Límite: {p.message_limit}</span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                <div
                                  style={{ width: `${usagePercentage}%` }}
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    usagePercentage >= 90
                                      ? "bg-red-500"
                                      : usagePercentage >= 75
                                      ? "bg-yellow-500"
                                      : "bg-gradient-to-r from-indigo-500 to-purple-500"
                                  }`}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(p.id, p.is_active)}
                                className="focus:outline-none"
                              >
                                {p.is_active ? (
                                  <ToggleRight className="w-8 h-8 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-slate-600 hover:text-slate-500 transition-all cursor-pointer" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
