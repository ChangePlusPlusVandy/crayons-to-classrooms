import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/itemController.js';
import express from 'express';

export const itemsRoutes = express.Router();

itemsRoutes.get('/', getItems);
itemsRoutes.get('/:id', getItemById);

itemsRoutes.post('/', createItem);

itemsRoutes.put('/:id', updateItem);

itemsRoutes.delete('/:id', deleteItem);
