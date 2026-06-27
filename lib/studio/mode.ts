// ──────────────────────────────────────────────────────────────────────────
// Pixio · Deployment mode
//   NEXT_PUBLIC_PIXIO_MODE = 'byo'    → users paste their own Prodia key (default)
//   NEXT_PUBLIC_PIXIO_MODE = 'hosted' → the server PRODIA_KEY runs every job
//                                       (you provide compute; gate/bill users
//                                        with your own auth layer on top)
// NEXT_PUBLIC_* is inlined at build time, so it reads the same on client + server.
// Changing it requires a rebuild / dev restart.
// ──────────────────────────────────────────────────────────────────────────

export const HOSTED_MODE = process.env.NEXT_PUBLIC_PIXIO_MODE === 'hosted';
export const BYO_MODE = !HOSTED_MODE;
