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

export const itemsRoutes = express.Router();

// get all items
itemsRoutes.get('/', getItems);

// get items by status
itemsRoutes.get('/status', getItemsByStatus);

// create a new item
itemsRoutes.post('/add', createItem);

// get items by current location
itemsRoutes.get('/location/:locationId', getItemsByLocationId);

// get items by product id
itemsRoutes.get('/product/:productId', getItemsByProductId);

// get item by ID
itemsRoutes.get('/:id', getItemById);

// update an existing item
itemsRoutes.patch('/update/:id', updateItem);

// delete an item
itemsRoutes.delete('/:id', deleteItem);
