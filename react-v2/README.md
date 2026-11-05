# RECOMP 2.0 React migration preview

This folder is an isolated, non-production React + Vite + TypeScript migration workspace. The existing root application remains the production-compatible RECOMP v1 entry point until functional parity and recovery tests pass.

## Current scope

- React/Vite/TypeScript, React Router and Zustand dependencies are established.
- The v2 encrypted-envelope reader matches the existing `recomp.encrypted.v2` PBKDF2-SHA256 (600,000 iterations) / AES-256-GCM envelope, including its AAD.
- A read-only unlock preview validates the old vault and reports record counts. It never writes, migrates, or deletes user data.
- Unknown vault fields are preserved in the in-memory typed model for forward compatibility.
- A focused compatibility test covers envelope metadata and malformed inputs.

This is an architecture checkpoint, not a feature-equivalent release. Training, plans, nutrition, measurements, backup/restore, daily unlock and the PWA lifecycle must be migrated and regression-tested before switching the production entry point. Do not deploy this preview over the root app.

## Local development

From this directory run `npm install`, `npm test`, and `npm run build`. The preview is configured for the repository Pages path. No backend or external data service is used.
