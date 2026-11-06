# React v2 migration gates

Release remains blocked until every gate below is completed and verified on the migration branch.

1. Preserve the v1 source and immutable recovery point; record baseline SHA. Never change `main` directly.
2. Port auth/session locking, same-day unlock and encrypted writes without changing PBKDF2/AES-GCM parameters or the v2 vault schema.
3. Port training, seven-day schedule, historical records, plan JSON/version library and JSON/CSV export. Keep actual records independent of templates.
4. Port nutrition records, public food catalog, aliases, dishes, custom foods, favorites, templates and serving calculations.
5. Port progress charts, settings, encrypted backup/restore and old-vault migrations. Unknown optional fields must survive round trips.
6. Keep the React preview isolated until legacy browser storage on the same origin is read-only validated. Never test with production user data.
7. Add Vitest coverage for old vault/backup fixtures and Playwright coverage for mobile/desktop, offline startup, lock/unlock, backup restore and data parity.
8. Verify iOS Safari/PWA and Android PWA on devices before changing the default Pages entry point.
9. Only after parity sign-off, schedule openGym and Train Libre research/integration as separate changes.
