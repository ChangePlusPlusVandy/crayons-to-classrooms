import { Request, Response } from 'express';
import pool from '../db.js';

enum InventoryAction {
  ADD = 'ADD',
  MOVE = 'MOVE',
  CLOCKOUT = 'CLOCKOUT',
  DISCARD = 'DISCARD',
  ADJUSTMENT = 'ADJUSTMENT',
}

// Controller functions for inventory movements

// GET all rows
export async function getAllInventoryMovements(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query('SELECT * FROM "inventory movement"');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET single row by id
export async function getMovementById(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE id = $1;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'ID not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by inventory action
export async function getMovementsByAction(
  req: Request<{ action: string }>,
  res: Response
): Promise<void> {
  const { action } = req.params;

  const AllowedActions = Object.values(InventoryAction);
  if (!AllowedActions.includes(action as InventoryAction)) {
    res.status(400).json({
      error: `Invalid inventory action "${action}". 
        Must be one of: ${AllowedActions.join(', ')}`,
    });
    return;
  }
  const validAction = action as InventoryAction;
  try {
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE inventory_action = $1;',
      [validAction]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movement with that action found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by item id
export async function getMovementsByItemId(
  req: Request<{ item_id: string }>,
  res: Response
): Promise<void> {
  const { item_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE item_id = $1;', [
      item_id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movement with that item Id found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by product id
export async function getMovementsByProductId(
  req: Request<{ product_id: string }>,
  res: Response
): Promise<void> {
  const { product_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE product_id = $1;', [
      product_id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movement with that product Id found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by starting location
export async function getMovementsByStartLocationId(
  req: Request<{ start_location_id: string }>,
  res: Response
): Promise<void> {
  const { start_location_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE from_location_id = $1;',
      [start_location_id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movements with that start location Id found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by ending location
export async function getMovementsByEndLocationId(
  req: Request<{ end_location_id: string }>,
  res: Response
): Promise<void> {
  const { end_location_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM "inventory movement" WHERE to_location_id = $1;',
      [end_location_id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movements with that end location Id found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by who moved it
export async function getMovementsByPerformedId(
  req: Request<{ performed_by_id: string }>,
  res: Response
): Promise<void> {
  const { performed_by_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE performed_by = $1', [
      performed_by_id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movements with that person Id found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET rows by time
export async function getMovementsByTime(
  req: Request<{ time: string }>,
  res: Response
): Promise<void> {
  const { time } = req.params;
  try {
    const result = await pool.query('SELECT * FROM "inventory movement" WHERE performed_at = $1', [
      time,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No movements at that date and time found' });
    } else {
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST (create) a new inventory movement
export async function createInventoryMovement(
  req: Request<
    {},
    {},
    {
      inventory_action: InventoryAction;
      item_id: string;
      product_id: string;
      from_location_id: string;
      to_location_id: string;
      quantity: number;
      performed_by: string;
      note?: string;
    }
  >,
  res: Response
): Promise<void> {
  const {
    inventory_action,
    item_id,
    product_id,
    from_location_id,
    to_location_id,
    quantity,
    performed_by,
    note,
  } = req.body;

  const AllowedActions = Object.values(InventoryAction);
  if (!AllowedActions.includes(inventory_action)) {
    res.status(400).json({
      error: `Invalid inventory action "${inventory_action}". 
        Must be one of: ${AllowedActions.join(', ')}`,
    });
    return;
  }
  if (
    !item_id ||
    !product_id ||
    !quantity ||
    !performed_by ||
    !from_location_id ||
    !to_location_id
  ) {
    res.status(400).json({ error: 'Missing required fields.' });
    return;
  }

  try {
    const result = await pool.query(
      `
            INSERT INTO "inventory movement" (
            inventory_action, 
            item_id, 
            product_id, 
            from_location_id, 
            to_location_id, 
            quantity, 
            performed_by, 
            note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
            `,
      [
        inventory_action,
        item_id,
        product_id,
        from_location_id,
        to_location_id,
        quantity,
        performed_by,
        note || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// PATCH (partial update) an inventory movement by id
export async function updateInventoryMovement(
  req: Request<
    { id: string },
    {},
    {
      inventory_action?: string | null;
      item_id?: string | null;
      product_id?: string | null;
      from_location_id?: string | null;
      to_location_id?: string | null;
      quantity?: number | null;
      performed_by?: string | null;
      performed_at?: string | null;
      note?: string | null;
    }
  >,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const {
    inventory_action,
    item_id,
    product_id,
    from_location_id,
    to_location_id,
    quantity,
    performed_by,
    performed_at,
    note,
  } = req.body;

  try {
    const result = await pool.query(
      `
            UPDATE "inventory movement" SET
            inventory_action = COALESCE($1, inventory_action),
            item_id = COALESCE($2, item_id),
            product_id = COALESCE($3, product_id),
            from_location_id = COALESCE($4, from_location_id),
            to_location_id = COALESCE($5, to_location_id),
            quantity = COALESCE($6, quantity),
            performed_by = COALESCE($7, performed_by),
            performed_at = COALESCE($8, performed_at),
            note = COALESCE($9, note)
            WHERE id = $10
            RETURNING *;
            `,
      [
        inventory_action ?? null,
        item_id ?? null,
        product_id ?? null,
        from_location_id ?? null,
        to_location_id ?? null,
        quantity ?? null,
        performed_by ?? null,
        performed_at ?? null,
        note ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'ID not found' });
      return;
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error('PATCH /inventory-movement/:id failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// DELETE an inventory movement by id
export async function deleteInventoryMovement(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM "inventory movement" WHERE id = $1 RETURNING *;', [
      id,
    ]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Inventory movement not found' });
    } else {
      res.json({ message: 'Deleted Successfully', deleted: result.rows[0] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
