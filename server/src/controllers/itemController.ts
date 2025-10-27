import { Request, Response } from 'express';
import pool from '../db.js';
import { validate as isUuid } from 'uuid';

export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await pool.query('SELECT * FROM items');
    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const item = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item.rows[0]);
  } catch (error) {
    console.error('Error fetching item by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemsByProductId = async (req: Request, res: Response) => {
  const { productId } = req.params;
  try {
    const items = await pool.query('SELECT * FROM items WHERE product_id = $1', [productId]);
    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items by product ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemsByLocationId = async (req: Request, res: Response) => {
  const { locationId } = req.params;
  try {
    const items = await pool.query('SELECT * FROM items WHERE current_location_id = $1', [
      locationId,
    ]);
    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items by location ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemsByStatus = async (req: Request, res: Response) => {
  const { status } = req.query;
  try {
    const items = await pool.query('SELECT * FROM items WHERE status = $1', [status]);
    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items by status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createItem = async (req: Request, res: Response) => {
  const { product_id, quantity, current_location_id, status, created_by } = req.body;

  try {
    const newItem = await pool.query(
      'INSERT INTO items (product_id, quantity, current_location_id, status, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
      [product_id, quantity, current_location_id, status, created_by]
    );
    res.status(201).json(newItem.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({ error: 'Invalid id (UUID required)' });
  }

  const allowed: Record<string, true> = {
    product_id: true,
    quantity: true,
    current_location_id: true,
    status: true,
  };

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(req.body ?? {})) {
    if (!allowed[key]) continue;

    if (key === 'product_id' && value != null) {
      if (!isUuid(String(value))) {
        return res.status(400).json({ error: 'Invalid product_id (UUID required)' });
      }

      // check if product_id exists
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [value]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
    }

    // insert parameter and increment index
    setClauses.push(`${key} = $${idx++}`);

    values.push(value);
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  } else {
    setClauses.push(`updated_at = NOW()`);
  }

  const sql = `
    UPDATE items
    SET ${setClauses.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;
  values.push(id);

  try {
    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('Error updating item:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deletedItem = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
    if (deletedItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
