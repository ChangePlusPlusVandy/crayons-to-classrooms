import { Request, Response } from 'express';
import pool from '../db.js';

// GET all rows
export async function getAllTests(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT id, message, created_at FROM test ORDER BY created_at DESC;'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET a single row by id
export async function getTestById(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, message, created_at FROM test WHERE id = $1;', [
      id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST (create) a new row
export async function createTest(
  req: Request<{}, {}, { message: string }>,
  res: Response
): Promise<void> {
  const { message } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO test (message) VALUES ($1) RETURNING id, message, created_at;',
      [message]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// PUT (update) a row by id
export async function updateTest(
  req: Request<{ id: string }, {}, { message?: string }>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { message } = req.body;

  try {
    const result = await pool.query(
      'UPDATE test SET message = COALESCE($1, message) WHERE id = $2 RETURNING id, message, created_at;',
      [message, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// DELETE a row by id
export async function deleteTest(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM test WHERE id = $1 RETURNING id, message, created_at;',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.json({ message: 'Deleted successfully', deleted: result.rows[0] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
