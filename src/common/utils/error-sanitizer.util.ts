/**
 * Error sanitization utility (CWE-209 remediation).
 * Removes sensitive information from error messages before sending to clients:
 * - Database names, table names, column names
 * - File paths and directory structures
 * - Stack traces
 * - Internal implementation details
 */

export class ErrorSanitizer {
  static sanitize(error: Error | string, isProduction: boolean = true): string {
    let message: string;

    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }

    if (isProduction) {
      if (
        this.isDatabaseError(message) ||
        this.isSequelizeError(message) ||
        this.isFileSystemError(message)
      ) {
        return 'An error occurred while processing your request. Please try again later.';
      }
    }

    message = message.replace(/database\s+["']?([\w-]+)["']?/gi, 'database');
    message = message.replace(/["']?([\w-]+)["']?\s+database/gi, 'database');
    message = message.replace(/table\s+["']?([\w.]+)["']?/gi, 'table');
    message = message.replace(/["']?([\w.]+)["']?\s+table/gi, 'table');
    message = message.replace(/dbo\.\w+/gi, 'table');
    message = message.replace(/column\s+["']?(\w+)["']?/gi, 'column');
    message = message.replace(/["'](\w+)["']\s+column/gi, 'column');
    message = message.replace(/FOREIGN\s+KEY\s+constraint\s+["']?([\w_]+)["']?/gi, 'constraint');
    message = message.replace(/constraint\s+["']?([\w_]+)["']?/gi, 'constraint');
    message = message.replace(/FK_[\w_]+/gi, 'constraint');
    message = message.replace(/[./\\][\w/\\]+\.(ts|js|json|txt|log|env)/gi, '[file path]');
    message = message.replace(/[A-Z]:\\[^\s]+/gi, '[file path]');
    message = message.replace(/\/[^\s]+\.(ts|js|json|txt|log|env)/gi, '[file path]');
    message = message.replace(/\.\/uploads\/[\w/-]+/gi, '[upload directory]');
    message = message.replace(/\.\/[\w/-]+/gi, '[directory]');
    message = message.replace(/INSERT\s+statement/gi, 'database operation');
    message = message.replace(/UPDATE\s+statement/gi, 'database operation');
    message = message.replace(/DELETE\s+statement/gi, 'database operation');
    message = message.replace(/conflicted\s+with/gi, 'conflict');
    message = message.replace(/Sequelize[\w\s]+error/gi, 'database error');
    message = message.replace(/Validation\s+error/gi, 'validation error');
    message = message.replace(/at\s+[\w.]+/gi, '');
    message = message.replace(/Error:\s*/gi, '');
    message = message.replace(/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN/gi, '[sql operation]');
    message = message.replace(/\s+/g, ' ').trim();

    if (!message || message.length < 5) {
      return 'An error occurred while processing your request. Please try again later.';
    }

    return message;
  }

  private static isDatabaseError(message: string): boolean {
    const dbPatterns = [
      /database/i,
      /table/i,
      /column/i,
      /constraint/i,
      /foreign\s+key/i,
      /primary\s+key/i,
      /INSERT\s+statement/i,
      /UPDATE\s+statement/i,
      /DELETE\s+statement/i,
      /sequelize/i,
      /SQL/i,
      /dbo\./i,
    ];
    return dbPatterns.some((pattern) => pattern.test(message));
  }

  private static isSequelizeError(message: string): boolean {
    return /sequelize|validation\s+error|unique\s+constraint/i.test(message);
  }

  private static isFileSystemError(message: string): boolean {
    return /\.\/|\.\.\/|[A-Z]:\\|\/var\/|\/usr\/|uploads\/|directory|file\s+path/i.test(message);
  }
}
