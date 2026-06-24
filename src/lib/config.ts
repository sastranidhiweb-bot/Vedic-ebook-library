// Backend API base URL (change this for production hosting)
//
// In production the app and the backend are served from the same domain, with
// the backend reverse-proxied under /api. We therefore target the SAME origin
// that served the page. This avoids "www vs non-www" mismatches: if the build
// hardcodes https://sastranidhi.org/api but the visitor is on
// https://www.sastranidhi.org, the API host fails to resolve (ERR_NAME_NOT_RESOLVED)
// and the category tree / books never load.
function resolveBackendApiUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_BACKEND_API_URL || '').trim();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalhost) {
      // Derive the API path (e.g. "/api") from the configured URL when possible,
      // but always use the current origin so requests stay same-host.
      let apiPath = '/api';
      try {
        const p = new URL(envUrl).pathname.replace(/\/+$/, '');
        if (p) apiPath = p;
      } catch {
        /* envUrl missing or not an absolute URL: keep the /api default */
      }
      return `${window.location.origin}${apiPath}`;
    }
  }

  // Local development (localhost): use the configured backend or default port.
  return envUrl || 'http://localhost:5000';
}

export const BACKEND_API_URL = resolveBackendApiUrl();

