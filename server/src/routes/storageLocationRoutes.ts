import express from 'express';
import {
  getAllStorageLocations,
  getStorageLocationById,
  getStorageLocationByLocationCode,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
} from '../controllers/storageLocationControllers.js';

const router = express.Router();

router.get('/', getAllStorageLocations); // GET /api/storage-locations
router.get('/locationCode/:locationCode', getStorageLocationByLocationCode); // GET /api/storage-locations/locationCode/:locationCode
router.get('/:id', getStorageLocationById); // GET /api/storage-locations/:id
router.post('/', createStorageLocation); // POST /api/storage-locations
router.patch('/:id', updateStorageLocation); // PATCH /api/storage-locations/:id
router.delete('/:id', deleteStorageLocation); // DELETE /api/storage-locations/:id

export default router;
