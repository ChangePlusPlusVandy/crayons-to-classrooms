import { Request, Response } from 'express';
import pool from '../db.js';

// GET all warehouses
export async function getAllWarehouse(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query('SELECT * FROM warehouse;');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET a single warehouse by id
export async function getWarehouseById(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM warehouse WHERE id = $1;', [id]);
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

// GET a single warehouse by name
export async function getWarehouseByName(
  req: Request<{ name: string }>,
  res: Response
): Promise<void> {
  const { name } = req.params;
  try {
    const result = await pool.query('SELECT * FROM warehouse WHERE name = $1;', [name]);
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

// POST (create) a new warehouse
export async function createWarehouse(
  req: Request<{}, {}, { name: string; address: string }>,
  res: Response
): Promise<void> {
  const { name, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO warehouse (name, address) VALUES ($1, $2) RETURNING *;',
      [name, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST (update a warehouse's name or address) by id
export async function updateWarehouse(
  req: Request<{ id: string }, {}, { name: string, address?: string}>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { name, address } = req.body;

  try {
    const result = await pool.query(
      'UPDATE warehouse SET name = COALESCE($1, name), address = COALESCE($2, address) WHERE id = $3 RETURNING *;',
      [name, address, id]
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

// DELETE a warehouse by id
export async function deleteWarehouse(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM warehouse WHERE id = $1 RETURNING *;', [id]);
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
