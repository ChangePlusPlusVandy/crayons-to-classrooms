import express from 'express';
import {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
} from '../controllers/testControllers.js';

const router = express.Router();

router.get('/', getAllTests); // GET /api/test
router.get('/:id', getTestById); // GET /api/test/:id
router.post('/', createTest); // POST /api/test
router.put('/:id', updateTest); // PUT /api/test/:id
router.delete('/:id', deleteTest); // DELETE /api/test/:id

export default router;
