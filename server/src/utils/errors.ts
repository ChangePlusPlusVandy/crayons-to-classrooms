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
