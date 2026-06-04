/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Users, MessagesSquare, LogOut, Terminal, ShieldAlert } from "lucide-react";

interface SidebarProps {
  activeTab: "clients" | "chat";
  setActiveTab: (tab: "clients" | "chat") => void;
  pendingMsgCount: number;
  userEmail?: string;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingMsgCount,
  userEmail = "agencia.gustavo.ia@gmail.com",
  onLogout,
}: SidebarProps) {
  return (
    <aside className="w-80 h-full flex flex-col justify-between glass-container border-r border-[#ffffff15] text-gray-300 select-none z-10 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 pt-10 md:pt-14 border-b border-[#ffffff0e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-wider text-white">
              Agencia IA
            </h1>
            <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase">
              Panel Admin
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        <button
          onClick={() => setActiveTab("clients")}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
            activeTab === "clients"
              ? "bg-gradient-to-r from-cyan-950/40 to-blue-950/40 text-cyan-400 border border-cyan-500/20 shadow-inner"
              : "hover:bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className={`w-5 h-5 ${activeTab === "clients" ? "text-cyan-400" : "text-gray-400"}`} />
            <span className="font-medium text-sm tracking-wide">Clientes / Bots</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
            activeTab === "chat"
              ? "bg-gradient-to-r from-cyan-950/40 to-blue-950/40 text-cyan-400 border border-cyan-500/20 shadow-inner"
              : "hover:bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <MessagesSquare className={`w-5 h-5 ${activeTab === "chat" ? "text-cyan-400" : "text-gray-400"}`} />
            <span className="font-medium text-sm tracking-wide">Live Chat</span>
          </div>
          {pendingMsgCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20 animate-pulse">
              {pendingMsgCount}
            </span>
          )}
        </button>
      </nav>

      {/* footer section / session details */}
      <div className="p-4 border-t border-[#ffffff0e] bg-black/20">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-[#ffffff03] border border-[#ffffff08]">
          <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center text-xs font-bold text-cyan-400 border border-cyan-500/20">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-gray-400 truncate font-mono">
              {userEmail}
            </p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Sesión activa
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-950/20 border border-transparent hover:border-red-900/40 transition-all duration-200 cursor-pointer text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
