import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemsByProductId,
  getItemsByLocationId,
  getItemsByStatus,
} from '../controllers/itemController.js';
import express from 'express';

const router = express.Router();

// get items by status
router.get('/status', getItemsByStatus);
// get all items
router.get('/', getItems);
// create a new item
router.post('/', createItem);
// get items by current location
router.get('/location/:locationId', getItemsByLocationId);
// get items by product id
router.get('/product/:productId', getItemsByProductId);
// get item by ID
router.get('/:id', getItemById);
// update an existing item
router.patch('/:id', updateItem);
// delete an item
router.delete('/:id', deleteItem);

export default router;
