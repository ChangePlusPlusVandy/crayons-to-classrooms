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

router.get('/', getAllWarehouse); // GET /api/warehouse
router.get('/name/:id', getWarehouseByName); // GET /api/warehouse/name/:id
router.get('/:id', getWarehouseById); // GET /api/warehouse/:id
router.post('/', createWarehouse); // POST /api/warehouse
router.patch('/:id', updateWarehouse); // PATCH /api/warehouse/:id
router.delete('/:id', deleteWarehouse); // DELETE /api/warehouse/:id

export default router;
