import { Request, Response } from 'express';
import pool from '../db.js';
import {
  createStorageLocationSchema,
  updateStorageLocationSchema,
  storageLocationIdParamSchema,
  locationCodeParamSchema,
  CreateStorageLocationInput,
  UpdateStorageLocationInput,
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
  return res.status(500).json({ error: 'Internal server error' });
};

// GET all storage locations
export async function getAllStorageLocations(req: Request, res: Response) {
  try {
    const result = await pool.query(
      'SELECT * FROM storage_locations ORDER BY created_at DESC'
    );
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
export async function getStorageLocationByLocationCode(
  req: Request,
  res: Response
) {
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

// POST storage location
export async function createStorageLocation(req: Request, res: Response) {
  try {
    const {
      aisle,
      fixture,
      location_code,
      active,
      extra_info,
      warehouse_id,
    }: CreateStorageLocationInput = createStorageLocationSchema.parse(req.body);

    const result = await pool.query(
      'INSERT INTO storage_locations (aisle, fixture, location_code, active, extra_info, warehouse_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;',
      [aisle, fixture, location_code, active, extra_info, warehouse_id]
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

    // Build dynamic UPDATE query (like itemController)
    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(value);
      }
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