import {
  getItemsInfo,
  getItemInfoById,
  createItemInfo,
  updateItemInfo,
  deleteItemInfo,
  getItemsInfoByName,
  getLimboItems,
  getInventoryStats,
} from '../controllers/itemInfoControllers.js';
import express from 'express';

const router = express.Router();

// get items info by name
router.get('/name/:name', getItemsInfoByName);
// get all items info
router.get('/', getItemsInfo);
// create a new item
router.post('/', createItemInfo);
// NOTE: /stats and /limbo must remain above /:id to prevent the dynamic segment from shadowing them
router.get('/limbo', getLimboItems);
router.get('/stats', getInventoryStats);
// get item by ID
router.get('/:id', getItemInfoById);
// update an existing item
router.patch('/:id', updateItemInfo);
// delete an item
router.delete('/:id', deleteItemInfo);
export default router;
