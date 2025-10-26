import express from 'express';
import {
  getAllWarehouse,
  getWarehouseById,
  getWarehouseByName,
  createWarehouse,
  updateWarehouseName,
  updateWarehouseAddress,
  deleteWarehouse,
} from '../controllers/warehouseControllers.js';

const router = express.Router();

router.get('/', getAllWarehouse); // GET /api/warehouse
router.get('/:id', getWarehouseById); // GET /api/warehouse/:id
router.get('/name/:name', getWarehouseByName); // GET /api/warehouse/name/:name
router.post('/', createWarehouse); // POST /api/warehouse
router.put('/:id/name', updateWarehouseName); // PUT /api/warehouse/:id/name
router.put('/:id/address', updateWarehouseAddress); // PUT /api/warehouse/:id/address
router.delete('/:id', deleteWarehouse); // DELETE /api/warehouse/:id

export default router;
