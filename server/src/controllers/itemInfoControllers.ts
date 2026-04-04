import { Request, Response } from 'express';
import pool from '../db.js';
import {
  createItemInfoSchema,
  updateItemInfoSchema,
  nameParamSchema,
  itemInfoIdParamSchema,
  itemInfoBrowseQuerySchema,
  CreateItemInfoInput,
  UpdateItemInfoInput,
} from '../utils/itemsInfoModel.js';
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
 * Retrieves a paginated, filterable list of items with warehouse and stock info.
 *
 * Query params:
 *   - page: Page number (default 1)
 *   - limit: Items per page (default 20, max 100)
 *   - warehouse: UUID - filter to items present in this warehouse
 *   - category: string - filter by item_info category
 *   - stock_status: 'in_stock' | 'out_of_stock' - filter by stock availability
 */
export const getItemsInfoPaginated = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, warehouse, category, stock_status } =
      itemInfoBrowseQuerySchema.parse(req.query);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`LOWER(ii.name) LIKE LOWER($${paramIdx++})`);
      params.push(`%${search}%`);
    }

    if (warehouse) {
      conditions.push(
        `EXISTS (SELECT 1 FROM items i WHERE i.name = ii.name AND i.warehouse = $${paramIdx++})`
      );
      params.push(warehouse);
    }

    if (category) {
      conditions.push(`ii.category = $${paramIdx++}`);
      params.push(category);
    }

    if (stock_status === 'in_stock') {
      if (warehouse) {
        conditions.push(
          `EXISTS (SELECT 1 FROM items i WHERE i.name = ii.name AND i.status = 'active')`
        );
      } else {
        conditions.push(`ii.stock > 0`);
      }
    } else if (stock_status === 'out_of_stock') {
      if (warehouse) {
        conditions.push(
          `NOT EXISTS (SELECT 1 FROM items i WHERE i.name = ii.name AND i.status = 'active')`
        );
      } else {
        conditions.push(`ii.stock = 0`);
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const dataQuery = `
      SELECT ii.*
      FROM item_info ii
      ${whereClause}
      ORDER BY ii.name ASC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM item_info ii
      ${whereClause}
    `;

    const dataParams = [...params, limit, offset];
    const countParams = [...params];

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const itemNames = dataResult.rows.map((row: { name: string }) => row.name);

    // Fetch warehouses and in-stock status as separate simple queries
    const [warehouseResult, inStockResult] = await Promise.all([
      pool.query(
        `SELECT DISTINCT i.name AS item_name, w.id, w.name
         FROM items i
         JOIN warehouse w ON i.warehouse = w.id
         WHERE i.name = ANY($1)`,
        [itemNames]
      ),
      pool.query(
        `SELECT DISTINCT name
         FROM items
         WHERE name = ANY($1) AND status = 'active'`,
        [itemNames]
      ),
    ]);

    // Build lookup maps
    const warehousesByName = new Map<string, { id: string; name: string }[]>();
    for (const row of warehouseResult.rows) {
      const list = warehousesByName.get(row.item_name) || [];
      list.push({ id: row.id, name: row.name });
      warehousesByName.set(row.item_name, list);
    }

    const inStockNames = new Set(inStockResult.rows.map((row: { name: string }) => row.name));

    // Combine results
    const data = dataResult.rows.map((row: { name: string; stock: number }) => ({
      ...row,
      warehouses: warehousesByName.get(row.name) || [],
      in_stock: warehouse ? inStockNames.has(row.name) : row.stock > 0,
    }));

    res.json({
      data,
      total,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching paginated item info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves all items from the database.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of all items or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsInfo = async (req: Request, res: Response) => {
  try {
    const items = await pool.query('SELECT * FROM item_info');

    if (!countRows(items.rows, res)) {
      return;
    }

    res.json(items.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves a single item by its unique ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the requested item or error message
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const getItemInfoById = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);

    const item = await pool.query('SELECT * FROM item_info WHERE id = $1', [id]);

    if (!countRows(item.rows, res)) {
      return;
    }

    res.json(item.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching item by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves detailed item info by ID, enriched with location data grouped by warehouse.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item_info (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object with item_info fields plus warehouse_locations array
 */
export const getItemInfoDetails = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);

    // 1. Get the item_info row
    const itemResult = await pool.query(`SELECT * FROM item_info WHERE id = $1`, [id]);

    if (!countRows(itemResult.rows, res)) {
      return;
    }

    const itemInfo = itemResult.rows[0];

    // 2. Get warehouse + location data as flat rows
    const locationResult = await pool.query(
      `SELECT
         w.id AS warehouse_id,
         w.name AS warehouse_name,
         sl.location_code,
         COUNT(i.id) AS stock
       FROM items i
       JOIN warehouse w ON i.warehouse::uuid = w.id
       LEFT JOIN storage_locations sl ON i.current_location_id::uuid = sl.id
       WHERE i.name = $1 AND i.status = 'active'
       GROUP BY w.id, w.name, sl.location_code`,
      [itemInfo.name]
    );

    // 3. Group flat rows by warehouse in JS
    const warehouseMap = new Map<
      string,
      {
        warehouse_id: string;
        warehouse_name: string;
        locations: { location_code: string; aisle: string; slot: string; stock: number }[];
      }
    >();

    for (const row of locationResult.rows) {
      const existing = warehouseMap.get(row.warehouse_id);
      const location = row.location_code
        ? {
            location_code: row.location_code,
            aisle: row.aisle,
            slot: row.slot,
            stock: parseInt(row.stock),
          }
        : null;

      if (existing) {
        if (location) existing.locations.push(location);
      } else {
        warehouseMap.set(row.warehouse_id, {
          warehouse_id: row.warehouse_id,
          warehouse_name: row.warehouse_name,
          locations: location ? [location] : [],
        });
      }
    }

    const warehouse_locations = Array.from(warehouseMap.values());

    res.json({
      ...itemInfo,
      warehouse_locations,
      in_stock: itemInfo.stock > 0,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching item details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves item info with a specific name.
 *
 * @param {Request} req - Express request object with:
 *   - name: Name of the items to filter by (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON array of items with the specified name or error message
 * @throws {500} Internal server error if database query fails
 */
export const getItemsInfoByName = async (req: Request, res: Response) => {
  try {
    const { name } = nameParamSchema.parse(req.params);
    const items = await pool.query('SELECT * FROM item_info WHERE name = $1', [name]);
    if (!countRows(items.rows, res)) {
      return;
    }
    res.json(items.rows);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error fetching items by name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Creates a new item in the database.
 *
 * @param {Request} req - Express request object with:
 *   - name: Item name (in body, required)
 *   - product_id: UUID of the product (in body, optional)
 *   - category: Category string (in body, optional)
 *   - quantity: Quantity number (in body, optional)
 *   - value: Value number (in body, optional)
 *   - item_limit: Limit number (in body, optional)
 *   - stock: total stock of the item (in body, required)
 *   - fixture: fixture of the item (in body, optional)
 *   - last_known_location_code: last known location code of the item (in body, required)
 *   - time_last_updated: time last updated of the item (in body, required)
 *   - notes: Notes string (in body, optional)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the newly created item or error message
 * @throws {500} Internal server error if validation or creation fails
 */
export const createItemInfo = async (req: Request, res: Response) => {
  try {
    const {
      name,
      product_id,
      category,
      quantity,
      value,
      item_limit,
      stock,
      fixture,
      last_known_location_code,
      time_last_updated,
      notes,
    }: CreateItemInfoInput = createItemInfoSchema.parse(req.body);
    if (product_id) {
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [product_id]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
    }

    const newItemInfo = await pool.query(
      'INSERT INTO item_info (name, product_id, category, quantity, value, item_limit, stock, fixture, last_known_location_code, time_last_updated, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [
        name,
        product_id,
        category,
        quantity,
        value,
        item_limit,
        stock,
        fixture,
        last_known_location_code,
        time_last_updated,
        notes,
      ]
    );

    res.status(201).json(newItemInfo.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Updates an existing item in the database.
 * Only updates fields that are provided in the request body.
 * Allowed fields: name, product_id, category, quantity, value, item_limit, stock, fixture, last_known_location_code, time_last_updated, notes.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item to update (in params)
 *   - Updatable fields in body (name, product_id, category, quantity, value, item_limit, stock, fixture, last_known_location_code, time_last_updated, notes)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} JSON object of the updated item or error message
 * @throws {400} No updatable fields provided if request body is empty or contains no allowed fields
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const updateItemInfo = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);
    const validatedData: UpdateItemInfoInput = updateItemInfoSchema.parse(req.body);

    if (validatedData.product_id) {
      const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [
        validatedData.product_id,
      ]);
      if (productCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid product_id' });
      }
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(validatedData)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(value);
    }

    setClauses.push(`time_last_updated = NOW()`);

    const sql = `
      UPDATE item_info
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
    console.error('Error updating item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Deletes an item from the database by its ID.
 *
 * @param {Request} req - Express request object with:
 *   - id: UUID of the item to delete (in params)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Success message or error message
 * @throws {404} Item not found if no item matches the provided ID
 * @throws {500} Internal server error if database query fails
 */
export const deleteItemInfo = async (req: Request, res: Response) => {
  try {
    const { id } = itemInfoIdParamSchema.parse(req.params);

    // Get the item's name before deleting so we can update stock
    const itemToDelete = await pool.query('SELECT name FROM item_info WHERE id = $1', [id]);

    if (itemToDelete.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deletedItem = await pool.query('DELETE FROM item_info WHERE id = $1 RETURNING *', [id]);

    if (!countRows(deletedItem.rows, res)) {
      return;
    }

    return res.json({ message: 'Item info deleted successfully' });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Retrieves distinct categories from item_info.
 */
export const getItemInfoCategories = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM item_info WHERE category IS NOT NULL ORDER BY category'
    );
    res.json(result.rows.map((row: { category: string }) => row.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
