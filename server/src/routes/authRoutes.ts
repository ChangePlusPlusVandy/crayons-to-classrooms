import express from 'express';
import { inviteUser, listUsers, removeUser } from '../controllers/authControllers.js';

const router = express.Router();

router.get('/users', listUsers); // GET  /api/auth/users
router.delete('/users/:id', removeUser); // DELETE /api/auth/users/:id
router.post('/invite', inviteUser); // POST /api/auth/invite

export default router;
