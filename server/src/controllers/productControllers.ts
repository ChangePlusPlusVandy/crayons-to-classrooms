import { Request, Response } from 'express';
import pool from '../db.js';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productNameParamSchema,
  productDescriptionParamSchema,
  CreateProductInput,
  UpdateProductInput,
} from '../utils/productsModel.js';
import { ZodError } from 'zod';

/**
 * Checks if the query returned any rows.
 * @param rows - The rows returned from the database query.
 * @param res - The Express response object.
 * @returns True if rows exist, otherwise sends a 404 response and returns false.
 */
const countRows = (rows: any[], res: Response) => {
  if (rows.length === 0) {
    res.status(404).json({ error: 'No entries found' });
    return false;
  }
  return true;
};

/**
 * Handles Zod validation errors and sends appropriate error response
 * @param error - The error object
 * @param res - The Express response object
 */
const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }
  console.error('Unexpected error:', error);
  return res.status(500).json({ error: 'Internal server error' });
};

/**
 * Retrieves all products from the database.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of all products or error message
 * @throws {500} Internal server error if database query fails
 */
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await pool.query('SELECT * FROM products ORDER BY name');

    if (!countRows(products.rows, res)) {
      return;
    }

    res.json(products.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves a single product by its unique ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the product (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the requested product or error message
 * @throws {404} Product not found if no product matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = productIdParamSchema.parse(req.params);

    const product = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (!countRows(product.rows, res)) {
      return;
    }

    res.json(product.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves products by name (case-insensitive partial match).
 *
 * @param {Request} req - Express request object with:
 *   - name: Name to search for (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of products matching the name or error message
 * @throws {404} No products found matching the search criteria
 * @throws {500} Internal server error if database query fails
 */
export const getProductByName = async (req: Request, res: Response) => {
  try {
    const { name } = productNameParamSchema.parse(req.params);

    const products = await pool.query(
      'SELECT * FROM products WHERE LOWER(name) LIKE LOWER($1) ORDER BY name',
      [`%${name}%`]
    );

    if (!countRows(products.rows, res)) {
      return;
    }

    res.json(products.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching products by name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves products by description (case-insensitive partial match).
 *
 * @param {Request} req - Express request object with:
 *   - description: Description text to search for (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of products matching the description or error message
 * @throws {404} No products found matching the search criteria
 * @throws {500} Internal server error if database query fails
 */
export const getProductByDescription = async (req: Request, res: Response) => {
  try {
    const { description } = productDescriptionParamSchema.parse(req.params);

    const products = await pool.query(
      'SELECT * FROM products WHERE LOWER(description) LIKE LOWER($1) ORDER BY name',
      [`%${description}%`]
    );

    if (!countRows(products.rows, res)) {
      return;
    }

    res.json(products.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching products by description:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Creates a new product in the database.
 *
 * @param {Request} req - Express request object with:
 *   - name: Product name (in body)
 *   - description: Product description (optional, in body)
 *   - unit_of_measure: Unit of measure (e.g., "each", "box", "kg") (in body)
 *   - value: Product value/price (in body)
 *   - item_limit: Maximum item limit (in body)
 *   - category: Product category (optional, in body)
 *   - total_count: Total count (in body, defaults to 0)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the newly created product or error message
 * @throws {400} Validation error if required fields are missing or invalid
 * @throws {500} Internal server error if validation or creation fails
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      unit_of_measure,
      value,
      item_limit,
      category,
      total_count,
    }: CreateProductInput = createProductSchema.parse(req.body);

    const newProduct = await pool.query(
      `INSERT INTO products (name, description, unit_of_measure, value, item_limit, category, total_count) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        name,
        description || null,
        unit_of_measure,
        value,
        item_limit,
        category || null,
        total_count || 0,
      ]
    );

    res.status(201).json(newProduct.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Updates an existing product in the database.
 * Only updates fields that are provided in the request body.
 * Allowed fields: name, description, unit_of_measure, value, item_limit, category, total_count.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the product to update (in params)
 *   - Updatable fields in body
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the updated product or error message
 * @throws {400} Invalid id format (must be valid UUID)
 * @throws {400} No updatable fields provided if request body is empty or contains no allowed fields
 * @throws {404} Product not found if no product matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = productIdParamSchema.parse(req.params);
    const validatedData: UpdateProductInput = updateProductSchema.parse(req.body);

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(validatedData)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(value);
    }

    const sql = `
      UPDATE products
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    values.push(id);

    const { rows } = await pool.query(sql, values);

    if (!countRows(rows, res)) {
      return;
    }

    return res.json(rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Deletes a product from the database by its ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the product to delete (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Success message or error message
 * @throws {404} Product not found if no product matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = productIdParamSchema.parse(req.params);

    const deletedProduct = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (!countRows(deletedProduct.rows, res)) {
      return;
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
