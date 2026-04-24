import express from 'express';
import {
  getAllStorageLocations,
  getStorageLocationById,
  getStorageLocationByLocationCode,
  getStorageLocationBySlot,
  createStorageLocation,
  updateStorageLocation,
  deleteStorageLocation,
  browseLocationCodes,
  getLocationCodeContents,
} from '../controllers/storageLocationControllers.js';

const router = express.Router();

router.get('/', getAllStorageLocations); // GET /api/storage-locations
router.get('/browse', browseLocationCodes); // GET /api/storage-locations/browse
router.get('/locationCode/:locationCode', getStorageLocationByLocationCode); // GET /api/storage-locations/locationCode/:locationCode
router.get('/slot/:slot', getStorageLocationBySlot); // GET /api/storage-locations/slot/:slot
router.get('/:id/contents', getLocationCodeContents); // GET /api/storage-locations/:id/contents
router.get('/:id', getStorageLocationById); // GET /api/storage-locations/:id
router.post('/', createStorageLocation); // POST /api/storage-locations
router.patch('/:id', updateStorageLocation); // PATCH /api/storage-locations/:id
router.delete('/:id', deleteStorageLocation); // DELETE /api/storage-locations/:id

export default router;
