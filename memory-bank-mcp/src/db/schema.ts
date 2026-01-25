export const SCHEMA_SQL = `
-- Features: hierarchical via slug pattern (feature/sub-feature/...)
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_features_slug ON features(slug);

-- Paths: files and directories (project-relative)
CREATE TABLE IF NOT EXISTS paths (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('file', 'directory')),
  description TEXT,
  use_when TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_paths_path ON paths(path);
CREATE INDEX IF NOT EXISTS idx_paths_type ON paths(type);

-- Feature-Paths junction
CREATE TABLE IF NOT EXISTS feature_paths (
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  path_id TEXT NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (feature_id, path_id)
);

-- Requirements linked to features
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_requirements_feature ON requirements(feature_id);

-- Objectives with status tracking
CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  plan_file_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_objectives_slug ON objectives(slug);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);

-- Tasks ordered within objectives
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  "order" INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_objective ON tasks(objective_id);

-- External tickets (JIRA, etc.)
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tickets_key ON tickets(key);

-- Objective-Features junction
CREATE TABLE IF NOT EXISTS objective_features (
  objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (objective_id, feature_id)
);

-- Objective-Tickets junction
CREATE TABLE IF NOT EXISTS objective_tickets (
  objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (objective_id, ticket_id)
);
`;
