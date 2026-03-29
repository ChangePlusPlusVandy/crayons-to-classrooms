import { Request, Response } from 'express';
import pool from '../db.js';
import {
  createStorageLocationSchema,
  updateStorageLocationSchema,
  storageLocationIdParamSchema,
  locationCodeParamSchema,
  CreateStorageLocationInput,
  UpdateStorageLocationInput,
  slotParamSchema,
} from '../utils/storageLocationModel.js';
import { ZodError } from 'zod';

// Handles Zod validation errors and sends appropriate error response
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
  return res.status(500).json({ error: 'Internal Server Error' });
};

// GET all storage locations
export async function getAllStorageLocations(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT * FROM storage_locations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET storage location by id
export async function getStorageLocationById(req: Request, res: Response) {
  try {
    const { id } = storageLocationIdParamSchema.parse(req.params);

    const result = await pool.query('SELECT * FROM storage_locations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET storage location by location code
export async function getStorageLocationByLocationCode(req: Request, res: Response) {
  try {
    const { locationCode } = locationCodeParamSchema.parse(req.params);

    const result = await pool.query('SELECT * FROM storage_locations WHERE location_code = $1', [
      locationCode,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// GET storage location by slot
export async function getStorageLocationBySlot(req: Request, res: Response) {
  try {
    const { slot } = slotParamSchema.parse(req.params);

    const result = await pool.query('SELECT * FROM storage_locations WHERE slot = $1', [slot]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// POST storage location
export async function createStorageLocation(req: Request, res: Response) {
  try {
    const { aisle, slot, fixture, active, extra_info, warehouse_id }: CreateStorageLocationInput =
      createStorageLocationSchema.parse(req.body);

    // Check if warehouse_id exists in warehouse table
    const warehouseCheck = await pool.query('SELECT id FROM warehouse WHERE id = $1', [
      warehouse_id,
    ]);
    if (warehouseCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid warehouse_id' });
    }

    const computedLocationCode = computeLocationCode(slot, fixture);

    const result = await pool.query(
      'INSERT INTO storage_locations (aisle, slot, fixture, location_code, active, extra_info, warehouse_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;',
      [aisle || null, slot, fixture || null, computedLocationCode, active, extra_info, warehouse_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// PATCH storage location
export async function updateStorageLocation(req: Request, res: Response) {
  try {
    const { id } = storageLocationIdParamSchema.parse(req.params);
    const validatedData: UpdateStorageLocationInput = updateStorageLocationSchema.parse(req.body);

    // If warehouse_id is being updated, verify it exists
    if (validatedData.warehouse_id) {
      const warehouseCheck = await pool.query('SELECT id FROM warehouse WHERE id = $1', [
        validatedData.warehouse_id,
      ]);
      if (warehouseCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid warehouse_id' });
      }
    }

    const currentLocation = await pool.query('SELECT * FROM storage_locations WHERE id = $1', [id]);
    if (currentLocation.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Prepare data for update, including auto-computed location_code if slot/fixture changed
    const updateData: UpdateStorageLocationInput & { location_code?: string } = {
      ...validatedData,
    };

    if (validatedData.slot !== undefined || validatedData.fixture !== undefined) {
      const currentSlot =
        validatedData.slot !== undefined ? validatedData.slot : currentLocation.rows[0].slot;
      const currentFixture =
        validatedData.fixture !== undefined
          ? validatedData.fixture
          : currentLocation.rows[0].fixture;
      updateData.location_code = computeLocationCode(currentSlot, currentFixture);
    }

    // Build dynamic UPDATE query (like itemController)
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updateData)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(value);
    }

    const sql = `
      UPDATE storage_locations
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    values.push(id);

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// DELETE storage location
export async function deleteStorageLocation(req: Request, res: Response) {
  try {
    const { id } = storageLocationIdParamSchema.parse(req.params);

    const result = await pool.query('DELETE FROM storage_locations WHERE id = $1 RETURNING *;', [
      id,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ message: 'Deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error, res);
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

function computeLocationCode(slot: string, fixture?: string | null): string {
  if (fixture) {
    return `${slot}${fixture}`;
  }
  return slot;
}
