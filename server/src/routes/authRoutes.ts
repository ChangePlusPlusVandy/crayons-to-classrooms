import express from 'express';
import { inviteUser } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/invite', inviteUser); // POST /api/auth/invite

export default router;
