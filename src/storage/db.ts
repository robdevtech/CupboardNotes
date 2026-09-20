import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  servings REAL NOT NULL DEFAULT 4,
  ingredients_json TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  photos_json TEXT NOT NULL DEFAULT '[]',
  source_url TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recipes_updated ON recipes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
`;

/** Migrate older milestone schemas that lack notes/photos columns. */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(recipes)');
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('notes')) {
    await db.execAsync('ALTER TABLE recipes ADD COLUMN notes TEXT');
  }
  if (!names.has('photos_json')) {
    await db.execAsync("ALTER TABLE recipes ADD COLUMN photos_json TEXT NOT NULL DEFAULT '[]'");
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('cupboard-notes.db');
      await db.execAsync(SCHEMA);
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

export function resetDbHandle(): void {
  dbPromise = null;
}
