// src/types.ts

import type { Context } from "hono";

// --- Core Environment & Hono Types ---
export interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  LOGS: KVNamespace;
  __STATIC_CONTENT: KVNamespace;
  SALT_ROUNDS: string;
  MAX_STORAGE_SIZE: string;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  RESEND_API_KEY?: string;
  ENVIRONMENT?: string;
  // Optional bindings referenced by settings endpoints
  ACCOUNT_ID?: string;
  R2_ACCOUNT_ID?: string;
  SCRIPT_NAME?: string;
  CLOUDFLARE_TOKEN?: string;
  FEATURED_ASSET_KEY?: string;
  PUBLIC_BUCKET_BASE_URL?: string;
}

export interface Variables {
  user: {
    id: number;
    username: string;
    email: string;
    is_admin: number;
    ai_enabled: number;
  };
}

export type C = Context<{ Bindings: Env; Variables: Variables }>;

// --- Database & Application Models ---
export interface User {
  id: number;
  username: string;
  email: string;
  // This is the securely hashed password.
  hashedPassword?: string;
  is_admin: number;
  dashboard_content?: string | null;
  logo_url?: string | null;
  max_models: number;
  last_login?: string | null;
  ai_enabled: number;
  ai_instructions: string;
  reset_token?: string | null;
  reset_expires?: string | null;
  created_at: string;
  updated_at?: string;
}

export type AdminUser = User; // Alias for compatibility

export interface Asset {
  name: string; // This is the r2_key
  url: string;
  file_name: string;
  file_type: string;
  size: number;
  uploaded: string;
  // Admin sharing properties
  user_id?: number;
  is_public?: boolean;
  is_admin_upload?: boolean;
  uploaded_by_admin?: number | null;
  owner_username?: string;
  is_owned_by_user?: boolean;
  // Companion file system
  companionSuggestion?: {
    needed: "GLB" | "USDZ";
    fileName: string;
    platform: string;
    currentPlatform: string;
  };
  // Unified model properties
  isUnified?: boolean;
  platforms?: {
    glb: boolean;
    usdz: boolean;
  };
  models?: Asset[];
}

export type AdminAsset = Asset; // Alias for compatibility

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  user_id?: number;
  username?: string;
  ip?: string;
  user_agent?: string;
}

// --- Added for user.ts DB row mapping ---
export type AssetRow = {
  r2_key: string;
  file_name: string;
  file_type: string;
  size: number;
  upload_date: string;
  user_id: number;
  is_public: number;
  is_admin_upload: number;
  uploaded_by_admin: number | null;
  owner_username: string;
};

// --- Added for upload.ts file validation ---
export interface FileType {
  type: string;
  maxSize: number;
  mimeTypes: string[];
}

// --- API Request/Response Types for Authentication ---
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

// --- Enhanced Error Handling Types ---
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  timestamp?: string;
  requestId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
}

// JWT Payload Types
export interface JWTPayload {
  sub: number; // user id
  id: number; // alias for sub
  email: string;
  username?: string;
  is_admin?: number;
  iat?: number;
  exp?: number;
}

export interface JWTTokenPayload {
  key?: string; // for temporary model access tokens
  iat?: number;
  exp?: number;
}

// --- API Request/Response Types for Admin Panel ---
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  [key: string]: string | number | boolean | Section[];
}

export interface AdminUsersResponse {
  success: boolean;
  users: User[];
}

export interface AdminAssetsResponse {
  success: boolean;
  files: Asset[];
  totalSize: number;
}

export interface AdminLogsResponse {
  success: boolean;
  logs: LogEntry[];
}

// --- Core UI and Data Structures for Frontend ---
export type AdminTab = "stats" | "users" | "assets" | "tools" | "logs";

export interface Section {
  type: string;
  data: string;
}

export interface AdminStats {
  totalUsers: number;
  totalAssets: number;
  totalStorage: number;
  activeUsers: number;
}

// --- Frontend State Management Types ---
export type FormMode = "login" | "forgot-password" | "reset-password";

export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface EditState {
  password?: string;
  sections: Section[];
  logo_url: string | null;
  max_models: number;
  ai_enabled: boolean;
  ai_instructions: string;
}

export interface AdminState {
  users: User[];
  assets: Asset[];
  logs: LogEntry[];
  stats: AdminStats;
  editStates: Record<number, EditState>;
  isLoading: boolean;
  error: string | null;
}

export type AdminAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "SET_ASSETS"; payload: { files: Asset[]; totalSize: number } }
  | { type: "SET_LOGS"; payload: LogEntry[] }
  | { type: "SET_STATS"; payload: Partial<AdminStats> }
  | {
      type: "UPDATE_EDIT_STATE";
      payload: {
        userId: number;
        field: keyof EditState;
        value: EditState[keyof EditState];
      };
    };
