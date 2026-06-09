// Centralized database name configuration for cross-database queries
// Wraps the DB name in brackets to support names with dashes

// Read lazily (at call time, not module-load time) so the value reflects
// process.env AFTER dotenv/ConfigModule have populated it. Reading at import
// time runs before main.ts loads .env, which silently fell back to the default.
export const getDbName = (): string => {
  const name = process.env.DB_NAME
  if (!name) {
    throw new Error('DB_NAME is not set. Configure it in the environment (.env) before starting the service.')
  }
  return name
}

// Backwards-compatible accessors — evaluated on each use, never cached at import.
export const DB_BRACKETED = (): string => `[${getDbName()}]`

// Helper to fully-qualify a table under dbo schema
// Example: fq('Controls') -> [grcsvc].dbo.Controls
export const fq = (table: string): string => `[${getDbName()}].dbo.${table}`


