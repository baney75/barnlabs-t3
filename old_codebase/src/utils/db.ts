// src/utils/db.ts
// Database initialization with migration versioning and better error handling.

import type { User } from "../types";
import { handleDatabaseError } from "./errors";

// Helper to map DB row to User type
function mapToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    username: row.username as string,
    email: row.email as string,
    hashedPassword: row.password_hash as string | undefined,
    is_admin: row.is_admin as number,
    dashboard_content: row.dashboard_content as string | null,
    logo_url: row.logo_url as string | null,
    max_models: row.max_models as number,
    last_login: row.last_login as string | null,
    ai_enabled: row.ai_enabled as number,
    ai_instructions: row.ai_instructions as string,
    reset_token: (row as Record<string, unknown>).reset_token as string | null,
    reset_expires: (row as Record<string, unknown>).reset_expires as
      | string
      | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function initializeDatabase(db: D1Database) {
  try {
    // Create migration tracking table first
    await db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT UNIQUE NOT NULL,
          applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        `,
      )
      .run();

    // Check current version
    const currentVersion = await db
      .prepare("SELECT version FROM migrations ORDER BY id DESC LIMIT 1")
      .first<{ version: string }>();

    const latestVersion = "1.4.0"; // Bumped for salt removal

    if (!currentVersion || currentVersion.version !== latestVersion) {
      // For development, if we're upgrading from 1.3.0, force a clean migration
      if (currentVersion && currentVersion.version === "1.3.0") {
        console.log(
          "Detected old schema with salt column, running migration...",
        );
        const migrated = await runSaltRemovalMigration(db);
        // Record latest version once salt migration completes (or if already applied)
        if (migrated) {
          await db
            .prepare("INSERT OR REPLACE INTO migrations (version) VALUES (?)")
            .bind(latestVersion)
            .run();
        }
      } else {
        await runInitialMigration(db, latestVersion);
      }
    }

    // Idempotent schema corrections beyond version gate
    await ensureSharesExpiresColumn(db);
    // Ensure USDZ linkage column exists; used to associate iOS Quick Look assets
    await ensureAssetsUsdzColumn(db);
    // Ensure admin sharing control columns exist
    await ensureAssetsAdminColumns(db);

    console.log(
      `Database initialized successfully at version ${latestVersion}`,
    );
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Database initialization error:", error.message);
    throw new Error(`Failed to initialize database: ${error.message}`);
  }
}

async function runSaltRemovalMigration(db: D1Database): Promise<boolean> {
  try {
    // Check if salt column exists and remove it
    const tableInfo = await db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.results as unknown as Array<{ name: string }>;
    const hasColumn = (name: string) => columns.some((c) => c.name === name);
    const hasSalt = hasColumn("salt");

    if (!hasSalt) {
      // Already migrated
      return true;
    }

    if (hasSalt) {
      console.log("Removing salt column from users table...");
      // Ensure no leftover temp table from a previous partial run
      try {
        await db.prepare("DROP TABLE IF EXISTS users_new").run();
      } catch (dropError) {
        console.warn(
          "Warning dropping users_new:",
          (dropError as Error).message,
        );
      }
      // Create new table without salt
      await db
        .prepare(
          `
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          is_admin INTEGER DEFAULT 0,
          dashboard_content TEXT DEFAULT '[]',
          logo_url TEXT DEFAULT NULL,
          max_models INTEGER DEFAULT 3,
          last_login TEXT,
          ai_enabled INTEGER DEFAULT 0,
          ai_instructions TEXT DEFAULT '',
          reset_token TEXT DEFAULT NULL,
          reset_expires TEXT DEFAULT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `,
        )
        .run();

      // Build INSERT selecting only existing columns; use defaults for missing ones
      const selectParts: string[] = [];
      const pushCol = (name: string, fallbackSql: string) => {
        if (hasColumn(name)) selectParts.push(name);
        else selectParts.push(fallbackSql);
      };

      // Order must match INSERT column list below
      selectParts.push("id");
      selectParts.push("username");
      selectParts.push("email");
      selectParts.push("password_hash");
      pushCol("is_admin", "0");
      pushCol("dashboard_content", "'[]'");
      pushCol("logo_url", "NULL");
      pushCol("max_models", "3");
      pushCol("last_login", "NULL");
      pushCol("ai_enabled", "0");
      pushCol("ai_instructions", "''");
      pushCol("reset_token", "NULL");
      pushCol("reset_expires", "NULL");
      pushCol("created_at", "CURRENT_TIMESTAMP");
      pushCol("updated_at", "CURRENT_TIMESTAMP");

      const insertSql = `INSERT INTO users_new (
          id, username, email, password_hash, is_admin, dashboard_content, logo_url, max_models, last_login, ai_enabled, ai_instructions, reset_token, reset_expires, created_at, updated_at
        )
        SELECT ${selectParts.join(", ")} FROM users`;

      await db.prepare(insertSql).run();

      // Drop old table and rename new one
      await db.prepare("DROP TABLE users").run();
      await db.prepare("ALTER TABLE users_new RENAME TO users").run();

      console.log("✓ Salt column removed successfully");
      return true;
    }
    return false;
  } catch (e: unknown) {
    console.error("Salt removal migration failed:", (e as Error).message);
    // Indicate failure so caller can handle
    return false;
  }
}

async function runInitialMigration(db: D1Database, version: string) {
  const tables = [
    {
      name: "users",
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          is_admin INTEGER DEFAULT 0,
          dashboard_content TEXT DEFAULT '[]',
          logo_url TEXT DEFAULT NULL,
          max_models INTEGER DEFAULT 3,
          last_login TEXT,
          ai_enabled INTEGER DEFAULT 0,
          ai_instructions TEXT DEFAULT '',
          reset_token TEXT DEFAULT NULL,
          reset_expires TEXT DEFAULT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `,
    },
    {
      name: "assets",
      sql: `
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          r2_key TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
    },
    {
      name: "shares",
      sql: `
        CREATE TABLE IF NOT EXISTS shares (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          description TEXT,
          title TEXT,
          background TEXT,
          dashboard_content TEXT NOT NULL,
          logo_url TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT DEFAULT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
    },
  ];

  // Create tables
  for (const table of tables) {
    try {
      await db.prepare(table.sql).run();
      console.log(`✓ Table ${table.name} created/verified`);
    } catch (e: unknown) {
      console.error(
        `✗ Failed to create table ${table.name}:`,
        (e as Error).message,
      );
      throw e;
    }
  }

  // Create indexes
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin)",
    "CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type)",
    "CREATE INDEX IF NOT EXISTS idx_assets_upload_date ON assets(upload_date)",
    "CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at)",
  ];

  for (const indexSql of indexes) {
    try {
      await db.prepare(indexSql).run();
    } catch (e: unknown) {
      console.error(`Index creation warning:`, (e as Error).message);
      // Don't fail on index errors
    }
  }

  // Record migration
  await db
    .prepare("INSERT OR REPLACE INTO migrations (version) VALUES (?)")
    .bind(version)
    .run();
}

// Ensure the 'expires_at' column exists on 'shares' (older DBs may miss it)
async function ensureSharesExpiresColumn(db: D1Database) {
  try {
    const info = await db.prepare("PRAGMA table_info(shares)").all();
    const cols = (info.results || []) as Array<{ name: string }>;
    const hasExpires = cols.some((c) => c.name === "expires_at");
    if (!hasExpires) {
      await db.prepare("ALTER TABLE shares ADD COLUMN expires_at TEXT").run();
      console.log("✓ Added missing shares.expires_at column");
    }
  } catch (e: unknown) {
    console.warn("ensureSharesExpiresColumn warning:", (e as Error).message);
  }
}

// Ensure the 'usdz_key' column exists on 'assets' to link USDZ variant to GLB
async function ensureAssetsUsdzColumn(db: D1Database) {
  try {
    const info = await db.prepare("PRAGMA table_info(assets)").all();
    const cols = (info.results || []) as Array<{ name: string }>;
    const hasUsdz = cols.some((c) => c.name === "usdz_key");
    if (!hasUsdz) {
      await db.prepare("ALTER TABLE assets ADD COLUMN usdz_key TEXT").run();
      console.log("✓ Added missing assets.usdz_key column");
    }
  } catch (e: unknown) {
    console.warn("ensureAssetsUsdzColumn warning:", (e as Error).message);
  }
}

// Ensure admin sharing control columns exist on 'assets'
async function ensureAssetsAdminColumns(db: D1Database) {
  try {
    const info = await db.prepare("PRAGMA table_info(assets)").all();
    const cols = (info.results || []) as Array<{ name: string }>;

    const hasIsPublic = cols.some((c) => c.name === "is_public");
    const hasIsAdminUpload = cols.some((c) => c.name === "is_admin_upload");
    const hasUploadedByAdmin = cols.some((c) => c.name === "uploaded_by_admin");

    if (!hasIsPublic) {
      await db
        .prepare("ALTER TABLE assets ADD COLUMN is_public INTEGER DEFAULT 0")
        .run();
      console.log("✓ Added missing assets.is_public column");
    }

    if (!hasIsAdminUpload) {
      await db
        .prepare(
          "ALTER TABLE assets ADD COLUMN is_admin_upload INTEGER DEFAULT 0",
        )
        .run();
      console.log("✓ Added missing assets.is_admin_upload column");
    }

    if (!hasUploadedByAdmin) {
      await db
        .prepare(
          "ALTER TABLE assets ADD COLUMN uploaded_by_admin INTEGER DEFAULT NULL",
        )
        .run();
      console.log("✓ Added missing assets.uploaded_by_admin column");
    }
  } catch (e: unknown) {
    console.warn("ensureAssetsAdminColumns warning:", (e as Error).message);
  }
}

// Helper function to check if table exists
export async function tableExists(
  db: D1Database,
  tableName: string,
): Promise<boolean> {
  try {
    const result = await db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .bind(tableName)
      .first();
    return !!result;
  } catch {
    return false;
  }
}

// Enhanced migration helper
export async function runMigration(
  db: D1Database,
  migration: string,
  description: string,
  version?: string,
) {
  try {
    await db.prepare(migration).run();
    console.log(`Migration completed: ${description}`);

    if (version) {
      await db
        .prepare("INSERT OR REPLACE INTO migrations (version) VALUES (?)")
        .bind(version)
        .run();
    }
  } catch (e: unknown) {
    const error = e as Error;
    console.error(`Migration failed (${description}):`, error.message);
    throw error;
  }
}

// Cleanup orphaned data
export async function cleanupOrphanedData(db: D1Database) {
  try {
    // Clean up assets without users
    await db
      .prepare("DELETE FROM assets WHERE user_id NOT IN (SELECT id FROM users)")
      .run();

    // Clean up shares without users
    await db
      .prepare("DELETE FROM shares WHERE user_id NOT IN (SELECT id FROM users)")
      .run();

    // Clean up expired password reset tokens
    await db
      .prepare(
        "UPDATE users SET reset_token = NULL, reset_expires = NULL WHERE reset_expires < ?",
      )
      .bind(new Date().toISOString())
      .run();

    console.log("✓ Orphaned data cleanup completed");
  } catch (e: unknown) {
    console.error("Cleanup failed:", (e as Error).message);
  }
}

// --- Data Access Functions (Added for CRUD operations) ---

export async function getAllUsers(db: D1Database): Promise<User[]> {
  try {
    const { results } = await db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all();
    return results.map(mapToUser);
  } catch (error) {
    handleDatabaseError(error, "get all users");
  }
}

export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<User | null> {
  try {
    const row = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (!row) return null;
    return mapToUser(row);
  } catch (error) {
    handleDatabaseError(error, "get user by email");
  }
}

// Fetch by username OR email
export async function getUserByIdentifier(
  db: D1Database,
  identifier: string,
): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .bind(identifier, identifier)
    .first();
  if (!row) return null;
  return mapToUser(row);
}

export async function createUser(
  db: D1Database,
  data: {
    username: string;
    email: string;
    hashedPassword: string;
  } & Partial<
    Omit<
      User,
      | "username"
      | "email"
      | "hashedPassword"
      | "id"
      | "created_at"
      | "updated_at"
    >
  >, // Refined type: Required non-optional for key fields
): Promise<User> {
  const fields = ["username", "email", "password_hash"];
  const values: (string | number | null)[] = [
    data.username,
    data.email,
    data.hashedPassword,
  ]; // Expanded typing for bind compatibility
  // Add optional fields
  const optionalFields = [
    "is_admin",
    "dashboard_content",
    "logo_url",
    "max_models",
    "ai_enabled",
    "ai_instructions",
  ];
  optionalFields.forEach((field) => {
    const value = data[field as keyof typeof data];
    if (value !== undefined) {
      fields.push(field);
      values.push(value as string | number | null); // Cast for type safety (null for optionals like dashboard_content)
    }
  });

  const placeholders = fields.map(() => "?").join(", ");

  const stmt = db.prepare(
    `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`,
  );
  const info = await stmt.bind(...values).run();

  if (!info.success) {
    throw new Error("Failed to create user");
  }

  const id = info.meta.last_row_id;
  const newUserRow = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first();
  if (!newUserRow) {
    throw new Error("Failed to retrieve new user");
  }

  return mapToUser(newUserRow);
}

export async function updateUser(
  db: D1Database,
  id: number,
  data: Partial<User>,
): Promise<User> {
  if (Object.keys(data).length === 0) {
    throw new Error("No data provided for update");
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = []; // Expanded typing for bind

  const addField = (
    dbField: string,
    value: string | number | null | undefined,
  ) => {
    if (value !== undefined) {
      fields.push(`${dbField} = ?`);
      values.push(value ?? null); // Coerce undefined to null for safety, but since checks prevent, it's redundant
    }
  };

  addField("username", data.username);
  addField("email", data.email);
  addField("password_hash", data.hashedPassword);
  addField("is_admin", data.is_admin);
  addField("dashboard_content", data.dashboard_content ?? null); // Explicit null for DB optionals
  addField("logo_url", data.logo_url ?? null);
  addField("max_models", data.max_models);
  addField("last_login", data.last_login ?? null);
  addField("ai_enabled", data.ai_enabled);
  addField("ai_instructions", data.ai_instructions);
  addField("reset_token", data.reset_token ?? null);
  addField("reset_expires", data.reset_expires ?? null);

  fields.push("updated_at = CURRENT_TIMESTAMP");

  const stmt = db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`);
  values.push(id);
  await stmt.bind(...values).run();

  const updatedRow = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first();
  if (!updatedRow) {
    throw new Error("Failed to retrieve updated user");
  }

  return mapToUser(updatedRow);
}

export async function deleteUser(db: D1Database, id: number): Promise<void> {
  try {
    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  } catch (error) {
    handleDatabaseError(error, "delete user");
  }
}

// Additional database utilities for better performance and functionality

export async function getUserCount(db: D1Database): Promise<number> {
  try {
    const result = await db
      .prepare("SELECT COUNT(*) as count FROM users")
      .first<{ count: number }>();
    return result?.count ?? 0;
  } catch (error) {
    handleDatabaseError(error, "get user count");
  }
}

export async function getUserById(
  db: D1Database,
  id: number,
): Promise<User | null> {
  try {
    const row = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first();
    if (!row) return null;
    return mapToUser(row);
  } catch (error) {
    handleDatabaseError(error, "get user by id");
  }
}

export async function getAssetsByUserId(
  db: D1Database,
  userId: number,
  limit: number = 50,
  offset: number = 0,
): Promise<{ assets: any[]; total: number }> {
  try {
    const [assetsResult, countResult] = await Promise.all([
      db
        .prepare(
          "SELECT * FROM assets WHERE user_id = ? ORDER BY upload_date DESC LIMIT ? OFFSET ?",
        )
        .bind(userId, limit, offset)
        .all(),
      db
        .prepare("SELECT COUNT(*) as count FROM assets WHERE user_id = ?")
        .bind(userId)
        .first<{ count: number }>(),
    ]);

    return {
      assets: assetsResult.results || [],
      total: countResult?.count ?? 0,
    };
  } catch (error) {
    handleDatabaseError(error, "get assets by user id");
  }
}

export async function getTotalStorageByUserId(
  db: D1Database,
  userId: number,
): Promise<number> {
  try {
    const result = await db
      .prepare("SELECT SUM(size) as total FROM assets WHERE user_id = ?")
      .bind(userId)
      .first<{ total: number }>();
    return result?.total ?? 0;
  } catch (error) {
    handleDatabaseError(error, "get total storage by user id");
  }
}

export async function getAssetByKey(
  db: D1Database,
  key: string,
): Promise<any | null> {
  try {
    const row = await db
      .prepare("SELECT * FROM assets WHERE r2_key = ?")
      .bind(key)
      .first();
    return row || null;
  } catch (error) {
    handleDatabaseError(error, "get asset by key");
  }
}

export async function createAsset(
  db: D1Database,
  data: {
    user_id: number;
    r2_key: string;
    file_name: string;
    file_type: string;
    size: number;
    usdz_key?: string;
  },
): Promise<any> {
  try {
    const fields = ["user_id", "r2_key", "file_name", "file_type", "size"];
    const values = [
      data.user_id,
      data.r2_key,
      data.file_name,
      data.file_type,
      data.size,
    ];

    if (data.usdz_key) {
      fields.push("usdz_key");
      values.push(data.usdz_key);
    }

    const placeholders = fields.map(() => "?").join(", ");
    const stmt = db.prepare(
      `INSERT INTO assets (${fields.join(", ")}) VALUES (${placeholders})`,
    );

    const info = await stmt.bind(...values).run();

    if (!info.success) {
      throw new Error("Failed to create asset");
    }

    return await db
      .prepare("SELECT * FROM assets WHERE id = ?")
      .bind(info.meta.last_row_id)
      .first();
  } catch (error) {
    handleDatabaseError(error, "create asset");
  }
}

export async function deleteAsset(db: D1Database, key: string): Promise<void> {
  try {
    await db.prepare("DELETE FROM assets WHERE r2_key = ?").bind(key).run();
  } catch (error) {
    handleDatabaseError(error, "delete asset");
  }
}

export async function updateAssetUsdzKey(
  db: D1Database,
  key: string,
  usdzKey: string,
): Promise<void> {
  try {
    await db
      .prepare("UPDATE assets SET usdz_key = ? WHERE r2_key = ?")
      .bind(usdzKey, key)
      .run();
  } catch (error) {
    handleDatabaseError(error, "update asset usdz key");
  }
}

// Batch operations for better performance
export async function batchDeleteAssets(
  db: D1Database,
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;

  try {
    const placeholders = keys.map(() => "?").join(", ");
    await db
      .prepare(`DELETE FROM assets WHERE r2_key IN (${placeholders})`)
      .bind(...keys)
      .run();
  } catch (error) {
    handleDatabaseError(error, "batch delete assets");
  }
}

// Statistics and analytics
export async function getDatabaseStats(db: D1Database): Promise<{
  totalUsers: number;
  totalAssets: number;
  totalStorage: number;
  adminUsers: number;
  activeUsers: number; // users who logged in within last 30 days
}> {
  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [userCount, assetStats, adminCount, activeUserCount] =
      await Promise.all([
        db
          .prepare("SELECT COUNT(*) as count FROM users")
          .first<{ count: number }>(),
        db
          .prepare(
            "SELECT COUNT(*) as count, SUM(size) as total_size FROM assets",
          )
          .first<{ count: number; total_size: number }>(),
        db
          .prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1")
          .first<{ count: number }>(),
        db
          .prepare("SELECT COUNT(*) as count FROM users WHERE last_login >= ?")
          .bind(thirtyDaysAgo)
          .first<{ count: number }>(),
      ]);

    return {
      totalUsers: userCount?.count ?? 0,
      totalAssets: assetStats?.count ?? 0,
      totalStorage: assetStats?.total_size ?? 0,
      adminUsers: adminCount?.count ?? 0,
      activeUsers: activeUserCount?.count ?? 0,
    };
  } catch (error) {
    handleDatabaseError(error, "get database stats");
  }
}
