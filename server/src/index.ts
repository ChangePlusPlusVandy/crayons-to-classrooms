import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import testRoutes from './routes/testRoutes.js';
import { productRoutes } from './routes/productRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import itemsRoutes from './routes/itemRoutes.js';
import storageLocationRoutes from './routes/storageLocationRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import inventoryMovementRoutes from './routes/inventoryMovementRoutes.js';
import itemInfoRoutes from './routes/itemInfoRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '10mb';

app.use(cors());
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

// Health check route
app.get('/', (_req, res) => {
  res.send('Server is running');
});

// All API routes require authentication
app.use('/api/auth', requireAuth, authRoutes);
app.use('/api/test', requireAuth, testRoutes);
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/item-info', requireAuth, itemInfoRoutes);
app.use('/api/items', requireAuth, itemsRoutes);
app.use('/api/storage-locations', requireAuth, storageLocationRoutes);
app.use('/api/users', requireAuth, usersRoutes);
app.use('/api/inventory-movement', requireAuth, inventoryMovementRoutes);
app.use('/api/warehouses', requireAuth, warehouseRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
