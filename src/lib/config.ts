// Backend API base URL.
//
// Set VITE_BACKEND_API_URL at BUILD time to your backend's reachable URL,
// including the /api suffix, e.g.:
//   VITE_BACKEND_API_URL=https://api.sastranidhi.org/api
// In local development it falls back to the local backend on port 5000.
//
// NOTE: the frontend host (www.sastranidhi.org) only serves the static app and
// does NOT proxy /api to the backend, so this MUST point at the actual backend
// host (Catalyst AppSail URL or an api.* subdomain mapped to it).
export const BACKEND_API_URL =
  ((import.meta as any).env?.VITE_BACKEND_API_URL || '').trim() || 'http://localhost:5000';

