import express from 'express';
import {
    getAllProducts,
    createProduct,
    getProductById,
    getProductByName,
    getProductByDescription,
    updateProduct,
    deleteProduct,
} from '../controllers/productControllers.js';

export const productRoutes = express.Router();

// get all products
productRoutes.get('/', getAllProducts);

// create a new product
productRoutes.post('/', createProduct);

// get product by name
productRoutes.get('/search/name/:name', getProductByName); 

// get product by description
productRoutes.get('/search/description/:description', getProductByDescription);

// get product by id
productRoutes.get('/:id', getProductById);

// update an existing product
productRoutes.patch('/:id', updateProduct);

// delete a product
productRoutes.delete('/:id', deleteProduct); 

