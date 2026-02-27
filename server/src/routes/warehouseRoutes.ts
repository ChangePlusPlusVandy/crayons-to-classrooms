import express from 'express';
import {
  getAllWarehouse,
  getWarehouseById,
  getWarehouseByName,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from '../controllers/warehouseControllers.js';

const router = express.Router();

router.get('/', getAllWarehouse); // GET /api/warehouses
router.get('/name/:id', getWarehouseByName); // GET /api/warehouses/name/:id
router.get('/:id', getWarehouseById); // GET /api/warehouses/:id
router.post('/', createWarehouse); // POST /api/warehouses
router.patch('/:id', updateWarehouse); // PATCH /api/warehouses/:id
router.delete('/:id', deleteWarehouse); // DELETE /api/warehouses/:id

export default router;
