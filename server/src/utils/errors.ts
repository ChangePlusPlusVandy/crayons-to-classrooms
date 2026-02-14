/**
 * Thrown when a foreign key reference points to a non-existent row.
 * The controller layer converts this to a 400 response.
 */
export class ForeignKeyError extends Error {
  constructor(public field: string) {
    super(`Invalid ${field}`);
    this.name = 'ForeignKeyError';
  }
}

/**
 * Thrown when a requested resource does not exist.
 * The controller layer converts this to a 404 response.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when an undo operation cannot be completed due to conflicting state.
 * The controller layer converts this to a 400 response.
 */
export class UndoConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UndoConflictError';
  }
}
