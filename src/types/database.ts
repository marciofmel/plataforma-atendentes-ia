// Types base do domínio multi-tenant
export type UUID = string;

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: UUID;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Membership {
  id: UUID;
  user_id: UUID;
  organization_id: UUID;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Agent {
  id: UUID;
  organization_id: UUID;
  name: string;
  system_prompt: string;
  voice_settings: Record<string, unknown>;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: UUID;
  organization_id: UUID;
  agent_id: UUID;
  channel: "whatsapp" | "voice" | "web";
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: UUID;
  conversation_id: UUID;
  organization_id: UUID;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface KnowledgeChunk {
  id: UUID;
  organization_id: UUID;
  document_id: UUID;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}
