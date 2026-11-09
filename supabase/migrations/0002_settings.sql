-- Adiciona coluna de configurações por organização
alter table organizations add column if not exists settings jsonb not null default '{}'::jsonb;
