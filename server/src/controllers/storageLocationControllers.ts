import { Request, Response } from 'express';
import pool from '../db.js';

// GET all storage locations
export async function getAllStorageLocations(req: Request, res: Response): Promise<void> {
    try {
        const result = await pool.query(
            'SELECT * FROM storage_locations ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
}

// GET storage location by id
export async function getStorageLocationById(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM storage_locations WHERE id = $1', [
            id,
        ]);
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

// GET storage location by location code
export async function getStorageLocationByLocationCode (req: Request<{ locationCode: string }>, res: Response): Promise<void> {
    const { locationCode } = req.params;
    try {
        const result = await pool.query('SELECT * FROM storage_locations WHERE location_code = $1', [
            locationCode,
        ]);
        if (result.rows.length == 0) {
            res.status(404).json({ error: 'Not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//POST storage location
export async function createStorageLocation(
    req: Request<{}, {}, { aisle: string; fixture: string; location_code: string; active: boolean; extra_info?: string; warehouse_id: number }>,
    res: Response
): Promise<void> {
    const { aisle, fixture, location_code, active, extra_info, warehouse_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO storage_locations (aisle, fixture, location_code, active, extra_info, warehouse_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;',
            [aisle, fixture, location_code, active, extra_info, warehouse_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//PATCH for each field
export async function updateStorageLocation(
    req: Request<{ id: string }, {}, { aisle?: string; fixture?: string; location_code?: string; active?: boolean; extra_info?: string; warehouse_id?: number }>,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { aisle, fixture, location_code, active, extra_info, warehouse_id } = req.body;
  
    try {
      const result = await pool.query(
        'UPDATE storage_locations SET aisle = COALESCE($1, aisle), fixture = COALESCE($2, fixture), location_code = COALESCE($3, location_code), active = COALESCE($4, active), extra_info = COALESCE($5, extra_info), warehouse_id = COALESCE($6, warehouse_id) WHERE id = $7 RETURNING *;',
        [aisle, fixture, location_code, active, extra_info, warehouse_id, id]
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

//DELETE storage location
export async function deleteStorageLocation(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
    const result = await pool.query('DELETE FROM storage_locations WHERE id = $1 RETURNING *;', [id]);
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