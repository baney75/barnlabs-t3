// src/contexts/AdminContext.tsx
import { createContext, useReducer } from "react";
import type { ReactNode, Dispatch } from "react";
import type { AdminAction, AdminState, EditState } from "../types";

export const AdminContext = createContext<
  { state: AdminState; dispatch: Dispatch<AdminAction> } | undefined
>(undefined); // Added export for hook access

const initialState: AdminState = {
  users: [],
  assets: [],
  logs: [],
  stats: { totalUsers: 0, totalAssets: 0, totalStorage: 0, activeUsers: 0 },
  editStates: {},
  isLoading: false,
  error: null,
};

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "SET_USERS": {
      const users = action.payload;
      const newEditStates: Record<number, EditState> = { ...state.editStates };
      users.forEach((user) => {
        if (!newEditStates[user.id]) {
          newEditStates[user.id] = {
            password: "",
            sections: (() => {
              if (!user.dashboard_content) return [];
              try {
                // Ensure what's parsed is an array, otherwise default to empty.
                const parsed = JSON.parse(user.dashboard_content);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.error(
                  `Failed to parse dashboard_content for user ${user.id}:`,
                  e,
                );
                return [];
              }
            })(),
            logo_url: user.logo_url ?? null, // Handle undefined as null
            max_models: user.max_models,
            ai_enabled: !!user.ai_enabled, // Convert number to boolean
            ai_instructions: user.ai_instructions,
          };
        }
      });
      return { ...state, users, editStates: newEditStates, isLoading: false };
    }
    case "SET_ASSETS":
      return {
        ...state,
        assets: action.payload.files,
        stats: { ...state.stats, totalStorage: action.payload.totalSize },
      };
    case "SET_LOGS":
      return { ...state, logs: action.payload };
    case "SET_STATS":
      return { ...state, stats: { ...state.stats, ...action.payload } };
    // FIX: This case now correctly handles the corrected action type.
    case "UPDATE_EDIT_STATE": {
      const { userId, field, value } = action.payload;
      if (!state.editStates[userId]) return state;
      return {
        ...state,
        editStates: {
          ...state.editStates,
          [userId]: {
            ...state.editStates[userId],
            [field]: value,
          },
        },
      };
    }
    default:
      return state;
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminReducer, initialState);
  return (
    <AdminContext.Provider value={{ state, dispatch }}>
      {children}
    </AdminContext.Provider>
  );
}
