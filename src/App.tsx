/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ClientDashboard from "./components/ClientDashboard";
import LiveChat from "./components/LiveChat";
import NewClientModal from "./components/NewClientModal";
import ClientDetailDrawer from "./components/ClientDetailDrawer";
import { Client, Message } from "./types";
import { Terminal, ShieldCheck, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"clients" | "chat">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "offline">("connecting");

  // Interaction overlays
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Load initial data
  const fetchData = async () => {
    try {
      const clientsRes = await fetch("/api/clients");
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      const messagesRes = await fetch("/api/messages");
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData);
      }
    } catch (err) {
      console.error("[App] Initial load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup real-time updates via Server-Sent Events (SSE)
    console.log("[SSE] Establishing live stream connection...");
    const eventSource = new EventSource("/api/live-updates");

    eventSource.onopen = () => {
      console.log("[SSE] Connection established successfully and active.");
      setSseStatus("live");
    };

    eventSource.addEventListener("CLIENTS_UPDATED", (event: MessageEvent) => {
      try {
        const updatedClients = JSON.parse(event.data);
        console.log("[SSE] Clients table updated. Length:", updatedClients.length);
        setClients(updatedClients);
      } catch (err) {
        console.error("[SSE] Failed to parse updated clients", err);
      }
    });

    eventSource.addEventListener("MESSAGES_UPDATED", (event: MessageEvent) => {
      try {
        const updatedMessages = JSON.parse(event.data);
        console.log("[SSE] Message stream updated. Length:", updatedMessages.length);
        setMessages(updatedMessages);
      } catch (err) {
        console.error("[SSE] Failed to parse updated messages", err);
      }
    });

    eventSource.onerror = (e) => {
      console.warn("[SSE] Stream went offline or disconnected. Reconnecting...", e);
      setSseStatus("offline");
    };

    // Polling fallback just in case SSE has issues
    const pollInterval = setInterval(() => {
      if (sseStatus === "offline" || sseStatus === "connecting") {
        console.log("[Fallback Polling] Syncing backend data...");
        fetchData();
      }
    }, 6000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [sseStatus]);

  // Handle toggling Bot Switch (PATCH /api/clients/:id)
  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic state
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: !currentStatus } : c))
      );

      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error("No se pudo persistir el cambio de estado del bot.");
      }
    } catch (err) {
      console.error(err);
      fetchData(); // Rollback on error
    }
  };

  // Handle toggling Google Sheets Vinculado state (PATCH /api/clients/:id)
  const handleToggleSheets = async (id: string, currentStatus: boolean) => {
    try {
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, sheetsLinked: !currentStatus } : c))
      );

      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetsLinked: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error("No se pudo configurar la sincronización de Sheets.");
      }
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };
  // Submit client registrations and details updates dynamically (POST or PATCH)
  const handleSaveClient = async (clientData: {
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
  }): Promise<boolean> => {
    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";

      let res;
      if (editingClient) {
        // Edit existing client
        res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: clientData.name,
            rubro: clientData.rubro,
            phone: clientData.phone,
            sheetsLinked: clientData.sheetsLinked,
            provider: clientData.provider,
            provider_token: clientData.provider_token,
            webhook_secret: clientData.webhook_secret,
            sheets_url: clientData.sheets_url,
            payment_mercadopago: clientData.payment_mercadopago,
            payment_uala_modo: clientData.payment_uala_modo,
            payment_stripe: clientData.payment_stripe,
            payment_paypal: clientData.payment_paypal,
            gemini_api_key: clientData.gemini_api_key,
            ai_model: clientData.ai_model,
            system_prompt: clientData.system_prompt,
          }),
        });
      } else {
        // Create new client
        res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: clientData.name,
            rubro: clientData.rubro,
            phone: clientData.phone,
            sheetsLinked: clientData.sheetsLinked,
            status: true, // starts enabled by default
            provider: clientData.provider,
            provider_token: clientData.provider_token,
            webhook_secret: clientData.webhook_secret,
            sheets_url: clientData.sheets_url,
            payment_mercadopago: clientData.payment_mercadopago,
            payment_uala_modo: clientData.payment_uala_modo,
            payment_stripe: clientData.payment_stripe,
            payment_paypal: clientData.payment_paypal,
            gemini_api_key: clientData.gemini_api_key,
            ai_model: clientData.ai_model,
            system_prompt: clientData.system_prompt,
          }),
        });
      }

      if (res && res.ok) {
        // Refresh local memory and SSE lists immediately
        const freshRes = await fetch("/api/clients");
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          setClients(freshData);
          if (selectedClientDetail && editingClient) {
            const updated = freshData.find((c: Client) => c.id === editingClient.id);
            if (updated) setSelectedClientDetail(updated);
          }
        }
        setEditingClient(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[SaveClient Error]:", err);
      return false;
    }
  };

  // Completely delete client row from in-memory DB (DELETE /api/clients/:id)
  const handleDeleteClient = async (id: string) => {
    try {
      // Optimistic delete
      setClients((prev) => prev.filter((c) => c.id !== id));
      if (selectedClientDetail && selectedClientDetail.id === id) {
        setSelectedClientDetail(null);
      }

      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar el comercio de la base de datos.");
      }
    } catch (err) {
      console.error("[DeleteClient Error]:", err);
      fetchData(); // rollback
    }
  };

  // Support message response manual submission
  const handleSendMessage = async (
    clientId: string,
    text: string,
    senderName?: string,
    senderPhone?: string
  ) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        text,
        senderName: senderName || "Soporte Agencia IA",
        senderPhone,
      }),
    });
    return res.json();
  };

  // Simulate/Receive incoming whatsapp payload from third-party Webhook endpoint
  const handleSendWebhook = async (payload: {
    clientId: string;
    senderName: string;
    senderPhone: string;
    text: string;
  }) => {
    const res = await fetch("/api/webhook/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  // Logout reset simulator
  const handleLogout = () => {
    setIsLoggedOut(true);
  };

  const handleReconnect = () => {
    setIsLoggedOut(false);
    fetchData();
  };

  // Inspect detail flyout navigates instantly to conversation view
  const handleNavigateToChat = (clientId: string) => {
    setSelectedClientDetail(null);
    setActiveTab("chat");
  };

  // Calculate pending message queue count
  // Filter clients to see which ones have their last message as incoming
  const getPendingMessagesCount = () => {
    let unrepliedCount = 0;
    clients.forEach((client) => {
      const clientMsgs = messages.filter((m) => m.clientId === client.id);
      if (clientMsgs.length > 0) {
        // Sort ascending to get last message
        const sorted = [...clientMsgs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const lastMsg = sorted[sorted.length - 1];
        if (lastMsg && lastMsg.incoming) {
          unrepliedCount += 1;
        }
      }
    });
    return unrepliedCount;
  };

  const pendingCount = getPendingMessagesCount();

  // If user simulated a general log out
  if (isLoggedOut) {
    return (
      <div className="w-screen h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0a0e1a] border border-red-505/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500" />
          
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/30 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-bold text-2xl text-white">Sesión Finalizada</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Has cerrado la sesión del panel de administración del ecosistema de la <span className="text-cyan-400">Agencia IA</span>.
            </p>
          </div>

          <button
            onClick={handleReconnect}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm tracking-wider transition-all shadow-lg shadow-cyan-500/15 cursor-pointer"
          >
            Volver a Ingresar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex bg-[#030712] text-gray-100 overflow-hidden relative">
      {/* Background Decor Ambient Vector Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Left Menu Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingMsgCount={pendingCount}
        onLogout={handleLogout}
      />

      {/* Central Interactive Canvas Viewport */}
      <main className="flex-1 h-full flex flex-col min-w-0 bg-[#060b18]/45 relative">
        {/* Loading Overlay */}
        {isLoading ? (
          <div className="absolute inset-0 bg-[#030712]/90 flex flex-col items-center justify-center z-40 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin" />
              <Terminal className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto" />
            </div>
            <p className="text-sm font-mono text-cyan-400 tracking-wider">Cargando base de datos de comercios...</p>
          </div>
        ) : null}

        {activeTab === "clients" ? (
          <ClientDashboard
            clients={clients}
            onToggleStatus={handleToggleStatus}
            onToggleSheets={handleToggleSheets}
            onOpenNewClientModal={() => {
              setEditingClient(null);
              setShowNewClientModal(true);
            }}
            onSelectClient={(client) => setSelectedClientDetail(client)}
            onEditClient={(client) => {
              setEditingClient(client);
              setShowNewClientModal(true);
            }}
            onDeleteClient={handleDeleteClient}
          />
        ) : (
          <LiveChat
            clients={clients}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendWebhook={handleSendWebhook}
          />
        )}

        {/* Real-time sync tiny status bar at the top-right corner to keep UI honest, premium, clean */}
        <div className="absolute top-6 md:top-8 right-8 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/45 border border-[#ffffff0e] text-[10px] select-none z-30 pointer-events-none font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 neon-green-pulse" />
          <span className="text-gray-400 font-medium">
            Conexión Real-Time Activa
          </span>
        </div>
      </main>

      {/* MODAL: Add / Edit Client Dialog */}
      {showNewClientModal && (
        <NewClientModal
          client={editingClient || undefined}
          onClose={() => {
            setShowNewClientModal(false);
            setEditingClient(null);
          }}
          onSubmit={handleSaveClient}
        />
      )}

      {/* FLYOUT DRAWER: Client Deeper Settings & Payload Trigger */}
      {selectedClientDetail && (
        <ClientDetailDrawer
          client={selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          onToggleStatus={handleToggleStatus}
          onToggleSheets={handleToggleSheets}
          onSendWebhook={handleSendWebhook}
          onNavigateToChat={handleNavigateToChat}
        />
      )}
    </div>
  );
}
