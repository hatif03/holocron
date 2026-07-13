-- Holocron initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES research_works(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  UNIQUE(work_id, node_key)
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES research_works(id) ON DELETE CASCADE,
  edge_key TEXT NOT NULL,
  source_node_key TEXT NOT NULL,
  target_node_key TEXT NOT NULL,
  UNIQUE(work_id, edge_key)
);

CREATE TABLE IF NOT EXISTS references_lib (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT DEFAULT '',
  year INT,
  bibtex TEXT DEFAULT '',
  s2_paper_id TEXT,
  pdf_storage_path TEXT,
  analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_references (
  work_id UUID NOT NULL REFERENCES research_works(id) ON DELETE CASCADE,
  reference_id UUID NOT NULL REFERENCES references_lib(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, reference_id)
);

CREATE TABLE IF NOT EXISTS paper_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES research_works(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL DEFAULT '{}',
  output_dir TEXT,
  word_count INT DEFAULT 0,
  pdf_path TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES paper_generations(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_health (
  agent_name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'online',
  endpoint_count INT NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_work ON graph_nodes(work_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_work ON graph_edges(work_id);
CREATE INDEX IF NOT EXISTS idx_generations_work ON paper_generations(work_id);
CREATE INDEX IF NOT EXISTS idx_events_generation ON generation_events(generation_id);

-- Default local user for npm mode
INSERT INTO users (id, email, password_hash, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'local@holocron.dev', 'local', 'Local User')
ON CONFLICT (email) DO NOTHING;
