import { Request, Response } from 'express';
import pool from '../db.js';

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

export const createItem = async (req: Request, res: Response) => {
  const {
    id,
    product_id,
    quantity,
    current_location_id,
    status,
    created_by,
    created_at,
    updated_at,
    name,
    description,
  } = req.body;
  try {
    const newItem = await pool.query(
      'INSERT INTO items (id, product_id, quantity, current_location_id, status, created_by, created_at, updated_at, name, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        id,
        product_id,
        quantity,
        current_location_id,
        status,
        created_by,
        created_at,
        updated_at,
        name,
        description,
      ]
    );
    res.status(201).json(newItem.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const updatedItem = await pool.query(
      'UPDATE items SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    if (updatedItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(updatedItem.rows[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Internal server error' });
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
