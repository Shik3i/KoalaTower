// The app is a prerendered SPA by default (see src/routes/+layout.ts), but the
// admin area is gated by a server-side session check and queries live data, so
// it must be server-rendered at request time, never prerendered.
export const prerender = false;
export const ssr = true;
export const csr = true;
