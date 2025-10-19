import { Request, Response } from 'express';
import pool from '../db.js';

// GET all rows
export async function getAllTests(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query('SELECT * FROM test;');
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
    const result = await pool.query('SELECT * FROM test WHERE id = $1;', [id]);
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
  req: Request<{}, {}, { name: string; age: number }>,
  res: Response
): Promise<void> {
  const { name, age } = req.body;
  try {
    const result = await pool.query('INSERT INTO test (name, age) VALUES ($1, $2) RETURNING *;', [
      name,
      age,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// PUT (update) a row by id
export async function updateTest(
  req: Request<{ id: string }, {}, { name?: string; age?: number }>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { name, age } = req.body;

  try {
    const result = await pool.query(
      'UPDATE test SET name = COALESCE($1, name), age = COALESCE($2, age) WHERE id = $3 RETURNING *;',
      [name, age, id]
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
    const result = await pool.query('DELETE FROM test WHERE id = $1 RETURNING *;', [id]);
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
