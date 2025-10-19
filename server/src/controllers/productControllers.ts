import { Request, Response } from 'express';
import pool from '../db.js';

// GET all products
export async function getAllProducts(req: Request, res: Response): Promise<void> {
    try {
        const result = await pool.query('SELECT * FROM products;');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// GET a single product by id
export async function getProductById(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1;', [id]);
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

// POST (create) a new product
export async function createProduct(
    req: Request<{}, {}, { name: string; price: number; description?: string }>,
    res: Response
): Promise<void> {
    const { name, price, description } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (name, price, description) VALUES ($1, $2, $3) RETURNING *;',
            [name, price, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// PUT (update) a product by id
export async function updateProduct(
    req: Request<{ id: string }, {}, { name?: string; description?: string 
        unit_of_measure?: string; value?: number; item_limit: number;
        category?: string
    }>,
    res: Response
): Promise<void> {
    const { id } = req.params;
    const { name, description, unit_of_measure,
        value, item_limit, category} = req.body;

    try {
        const result = await pool.query(
            'UPDATE products SET name = COALESCE($1, name), price = COALESCE($2, price), description = COALESCE($3, description) WHERE id = $4 RETURNING *;',
            [name, description, unit_of_measure, value, item_limit, category, id]
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

// DELETE a product by id
export async function deleteProduct(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *;', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Not found' });
        } else {
            res.json({ message: 'Deleted successfully' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}