-- Migration 024: site settings (maintenance mode)

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value_json)
VALUES ('maintenance_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site settings"
  ON site_settings FOR SELECT
  USING (true);
















