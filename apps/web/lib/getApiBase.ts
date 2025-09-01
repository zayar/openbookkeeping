export function getApiBase() {
  // In the browser we always go through Next rewrites
  if (typeof window !== 'undefined') return '/api'
  // On the server (SSR), still use relative path so Next proxy applies
  return '/api'
}

