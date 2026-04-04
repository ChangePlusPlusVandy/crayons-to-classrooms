import {
  getItemsInfo,
  getItemInfoById,
  getItemInfoDetails,
  getItemsInfoPaginated,
  getItemInfoCategories,
  createItemInfo,
  updateItemInfo,
  deleteItemInfo,
  getItemsInfoByName,
  getLimboItems,
  getOutOfStockItems,
  getInventoryStats,
} from '../controllers/itemInfoControllers.js';
import express from 'express';

const router = express.Router();

// get items info by name
router.get('/name/:name', getItemsInfoByName);
// get paginated, filterable items info
router.get('/browse', getItemsInfoPaginated);
// get distinct categories
router.get('/categories', getItemInfoCategories);
// get all items info
router.get('/', getItemsInfo);
// create a new item
router.post('/', createItemInfo);
// NOTE: /stats and /limbo must remain above /:id to prevent the dynamic segment from shadowing them
router.get('/limbo', getLimboItems);
// get all item_info rows with stock = 0 and limbo = FALSE
router.get('/out-of-stock', getOutOfStockItems);
router.get('/stats', getInventoryStats);
// get item details with location data
router.get('/:id/details', getItemInfoDetails);
// get item by ID
router.get('/:id', getItemInfoById);
// update an existing item
router.patch('/:id', updateItemInfo);
// delete an item
router.delete('/:id', deleteItemInfo);
export default router;
