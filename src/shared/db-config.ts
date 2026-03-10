// Centralized database name configuration for cross-database queries
// Wraps the DB name in brackets to support names with dashes

export const DB_NAME = process.env.DB_NAME || 'new_madinetmasr'

// Example output: [new_madinetmasr]
export const DB_BRACKETED = `[${DB_NAME}]`

// Helper to fully-qualify a table under dbo schema
// Example: fq('Controls') -> [new_madinetmasr].dbo.Controls
export const fq = (table: string) => `${DB_BRACKETED}.dbo.${table}`


