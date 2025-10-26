//users routes
import express from 'express';
import {
 getAllUsers,
 getUserByName,
 getUserById,
 getUsersByRole,
 getUsersBySchool,
 getUsersByDistrict,
 createUser,
 updateUser,
 deleteUser,
} from '../controllers/usersControllers.js';


const router = express.Router();


router.get('/', getAllUsers); // GET /api/users
router.get('/:id', getUserById); // GET /api/users/:id
router.get('/name/:name', getUserByName); // GET /api/users/name/:name
router.get('/role/:role', getUsersByRole); // GET /api/users/role/:role
router.get('/school/:school', getUsersBySchool); // GET /api/users/school/:school
router.get('/district/:district', getUsersByDistrict); // GET /api/users/district/:district
router.post('/', createUser); // POST /api/users
router.put('/:id', updateUser); // PUT /api/users/:id
router.delete('/:id', deleteUser); // DELETE /api/users/:id




export default router;