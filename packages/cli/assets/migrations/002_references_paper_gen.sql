-- References & Paper Generation UI fidelity extensions

ALTER TABLE references_lib
  ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS doi TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

ALTER TABLE paper_generations
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'graph',
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT '';

ALTER TABLE paper_generations
  ALTER COLUMN work_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_graph_nodes_reference_id
  ON graph_nodes ((data->>'reference_id'))
  WHERE data->>'reference_id' IS NOT NULL;
