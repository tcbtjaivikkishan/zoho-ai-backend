create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  source text,
  chunk text,
  embedding vector(1536)
);
