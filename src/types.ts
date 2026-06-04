/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Client {
  id: string; // uuid
  name: string;
  rubro: string;
  status: boolean; // active/inactive WhatsApp bot
  sheetsLinked: boolean; // "🔗 Google Sheets vinculado" indicator
  phone: string; // linked WhatsApp number
  createdAt: string;
  provider: string; // "Kapso IA" | "Meta (Oficial API)"
  provider_token?: string;
  webhook_secret?: string;
  sheets_url?: string;
  payment_mercadopago?: string;
  payment_uala_modo?: string;
  payment_stripe?: string;
  payment_paypal?: string;
  gemini_api_key?: string;
  ai_model: string; // "ChatGPT - GPT-4o mini (Económico)" | "ChatGPT - GPT-4o (Avanzado)" | etc.
  system_prompt: string;
}

export interface Message {
  id: string;
  clientId: string;
  senderName: string;
  senderPhone: string; // normalized
  text: string;
  incoming: boolean; // true = incoming from user, false = reply from IA bot
  timestamp: string;
}

export interface WebhookPayload {
  clientId: string;
  senderName: string;
  senderPhone: string;
  text: string;
  incoming?: boolean;
}
