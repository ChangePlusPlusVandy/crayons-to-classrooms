import { getItems } from '../controllers/itemController.js';
import express from 'express';

export const itemsRoutes = express.Router();

itemsRoutes.get('/', getItems);
