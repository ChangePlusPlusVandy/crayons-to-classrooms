import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemsByName,
  getItemsByProductId,
  getItemsByLocationId,
  getItemsByWarehouseId,
  getItemsByStatus,
  createItemsBulk,
} from '../controllers/itemController.js';
import express from 'express';

const router = express.Router();

// get items by status
router.get('/status', getItemsByStatus);
// get items by name
router.get('/name/:name', getItemsByName);
// get items by current location
router.get('/location/:locationId', getItemsByLocationId);
// get items by product id
router.get('/product/:productId', getItemsByProductId);
// get items by warehouse id
router.get('/warehouse/:warehouseId', getItemsByWarehouseId);
// get all items
router.get('/', getItems);
// create a new item
router.post('/', createItem);
// create multiple items
router.post('/bulk', createItemsBulk);
// get item by ID
router.get('/:id', getItemById);
// update an existing item
router.patch('/:id', updateItem);
// delete an item
router.delete('/:id', deleteItem);

export default router;
