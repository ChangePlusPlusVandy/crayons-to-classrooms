import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import testRoutes from './routes/testRoutes.js';
import { productRoutes } from './routes/productRoutes.js';

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
// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
