-- Create Decks Table
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  current_card_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX decks_category_last_accessed_at_idx
  ON decks (category, last_accessed_at DESC);

CREATE INDEX decks_last_accessed_at_idx
  ON decks (last_accessed_at DESC);

-- Create Cards Table
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT REFERENCES decks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INT NOT NULL,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Global Style Settings Table
CREATE TABLE app_style_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_style_settings ENABLE ROW LEVEL SECURITY;

-- Public Policies for decks
CREATE POLICY "Anyone can read decks" ON decks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert decks" ON decks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update decks" ON decks FOR UPDATE USING (true) WITH CHECK (true);

-- Public Policies for cards
CREATE POLICY "Anyone can read cards" ON cards FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cards" ON cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cards" ON cards FOR UPDATE USING (true) WITH CHECK (true);

-- Public Policies for app style settings
CREATE POLICY "Anyone can read app style settings" ON app_style_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert app style settings" ON app_style_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update app style settings" ON app_style_settings FOR UPDATE USING (true) WITH CHECK (true);


-- Public Policies for delete
CREATE POLICY "Anyone can delete decks" ON decks FOR DELETE USING (true);
CREATE POLICY "Anyone can delete cards" ON cards FOR DELETE USING (true);
CREATE POLICY "Anyone can delete app style settings" ON app_style_settings FOR DELETE USING (true);
