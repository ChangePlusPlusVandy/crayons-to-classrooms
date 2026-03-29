import express from 'express';
import {
  getAllInventoryMovements,
  getAllMovementsDetailed,
  getMovementById,
  getMovementsByAction,
  getMovementsByItemId,
  getMovementsByProductId,
  getMovementsByStartLocationId,
  getMovementsByEndLocationId,
  getMovementsByPerformedId,
  getMovementsOnAndBeforeDate,
  getMovementsOnAndAfterDate,
  createInventoryMovement,
  createItemWithMovement,
  bulkCreateItemsWithMovement,
  moveItemsWithMovement,
  removeItemsWithMovement,
  updateInventoryMovement,
  deleteInventoryMovement,
  undoInventoryMovement,
  editInventoryMovementAdd,
  editInventoryMovementMove,
  editInventoryMovementRemove,
} from '../controllers/inventoryMovementControllers.js';

const router = express.Router();
router.get('/', getAllInventoryMovements); // GET /api/inventory-movement
router.get('/detailed', getAllMovementsDetailed); // GET /api/inventory-movement/detailed?page=1&limit=10
router.get('/action/:inventory_action', getMovementsByAction); // GET /api/inventory-movement/action/:inventory_action
router.get('/item/:item_id', getMovementsByItemId); // GET /api/inventory-movement/item/:item_id
router.get('/product/:product_id', getMovementsByProductId); // GET /api/inventory-movement/product/:product_id
router.get('/start-location/:start_location_id', getMovementsByStartLocationId); // GET /api/inventory-movement/start-location/:start_location_id
router.get('/end-location/:end_location_id', getMovementsByEndLocationId); // GET /api/inventory-movement/end-location/:end_location_id
router.get('/performed-by/:performed_by_id', getMovementsByPerformedId); // GET /api/inventory-movement/performed-by/:performed_by_id
router.get('/before/:date', getMovementsOnAndBeforeDate); // GET /api/inventory-movement/before/:date
router.get('/after/:date', getMovementsOnAndAfterDate); // GET /api/inventory-movement/after/:date
router.post('/', createInventoryMovement); // POST /api/inventory-movement
router.post('/with-item', createItemWithMovement); // POST /api/inventory-movement/with-item
router.post('/with-items', bulkCreateItemsWithMovement); // POST /api/inventory-movement/with-items
router.post('/with-move', moveItemsWithMovement); // POST /api/inventory-movement/with-move
router.post('/with-removal', removeItemsWithMovement); // POST /api/inventory-movement/with-removal
router.post('/:id/undo', undoInventoryMovement); // POST /api/inventory-movement/:id/undo (must be before /:id routes)
router.get('/:id', getMovementById); // GET /api/inventory-movement/:id
router.patch('/:id', updateInventoryMovement); // PATCH /api/inventory-movement/:id
router.delete('/:id', deleteInventoryMovement); // DELETE /api/inventory-movement/:id
router.post('/:id/undo', undoInventoryMovement); // POST /api/inventory-movement/:id/undo
router.post('/:id/edit-add', editInventoryMovementAdd); // POST /api/inventory-movement/:id/edit-add
router.post('/:id/edit-move', editInventoryMovementMove); // POST /api/inventory-movement/:id/edit-move
router.post('/:id/edit-remove', editInventoryMovementRemove); // POST /api/inventory-movement/:id/edit-remove

export default router;
