// Centralized database name configuration for cross-database queries
// Wraps the DB name in brackets to support names with dashes

export const DB_NAME = process.env.GRC_DB_NAME || 'NEWDCC-V4-UAT'

// Example output: [NEWDCC-V4-UAT]
export const DB_BRACKETED = `[${DB_NAME}]`

// Helper to fully-qualify a table under dbo schema
// Example: fq('Controls') -> [NEWDCC-V4-UAT].dbo.Controls
export const fq = (table: string) => `${DB_BRACKETED}.dbo.${table}`


