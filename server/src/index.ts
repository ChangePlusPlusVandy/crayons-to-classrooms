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

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (_req, res) => {
  res.send('Server is running');
});

// Mount example test routes
app.use('/api/test', testRoutes);
app.use('/api/products', productRoutes);

app.use('/api/items', itemsRoutes);
app.use('/api/storage-locations', storageLocationRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inventory-movement', inventoryMovementRoutes);
app.use('/api/warehouses', warehouseRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
