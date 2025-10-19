import { Request, Response } from 'express';
import pool from '../db.js';

export const getItems = async (req: Request, res: Response) => {
  console.log('Fetching items...');
  try {
    const items = await pool.query('SELECT * FROM items');
    console.log('Items fetched:', items.rows);
    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
