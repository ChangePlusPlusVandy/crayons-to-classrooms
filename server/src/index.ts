import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import testRoutes from './routes/testRoutes.js';
import inventoryMovementRoutes from './routes/inventoryMovementRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (_req, res) => {
  res.send('Server is running');
});

// Mount inventory movement routes
app.use('/api/inventory-movement', inventoryMovementRoutes);
// Mount example test routes
app.use('/api/test', testRoutes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
<<<<<<< HEAD

// Mount example test routes
app.use('/api/test', testRoutes);
// Mount inventory movement routes
app.use('/api/inventory-movement', inventoryMovementRoutes);

=======
>>>>>>> 471d8217b9faf39d767933b0d10ec652f16a1a80
