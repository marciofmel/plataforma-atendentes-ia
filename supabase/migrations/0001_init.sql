-- Migration inicial: schema multi-tenant com RLS
create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  system_prompt text not null default '',
  voice_settings jsonb not null default '{}'::jsonb,
  temperature numeric not null default 0.7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','voice','web')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table organizations enable row level security;
alter table users enable row level security;
alter table memberships enable row level security;
alter table agents enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;

-- Policies: acesso por organização ativa (via memberships)
create policy "orgs_select_member" on organizations
  for select using (
    id in (select organization_id from memberships where user_id = auth.uid())
  );

create policy "memberships_self" on memberships
  for select using (user_id = auth.uid());

create policy "agents_org" on agents
  for all using (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  ) with check (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  );

create policy "conversations_org" on conversations
  for all using (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  ) with check (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  );

create policy "messages_org" on messages
  for all using (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  ) with check (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  );

create policy "knowledge_documents_org" on knowledge_documents
  for all using (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  ) with check (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  );

create policy "knowledge_chunks_org" on knowledge_chunks
  for all using (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  ) with check (
    organization_id in (select organization_id from memberships where user_id = auth.uid())
  );
