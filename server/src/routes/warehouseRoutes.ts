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
router.get('/:id', getWarehouseById); // GET /api/warehouse/:id
router.get('/:name', getWarehouseByName); // GET /api/warehouse/name/:name
router.post('/', createWarehouse); // POST /api/warehouse
router.patch('/:id', updateWarehouse); // PUT /api/warehouse/:id/name
router.delete('/:id', deleteWarehouse); // DELETE /api/warehouse/:id

export default router;
