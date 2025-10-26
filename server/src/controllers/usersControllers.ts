//users controllers
import { Request, Response } from 'express';
import pool from '../db.js';




//controllers:
// get all users
// get user by name
// get user by id
// get users by role
// get users by school
// get users by district
// create user
// edit each individual field (not ID or timestamp)
// delete user




// GET all rows
export async function getAllUsers(req: Request, res: Response): Promise<void> {
 try {
   const result = await pool.query('SELECT * FROM users;');
   res.json(result.rows);
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}


// GET user by name
export async function getUserByName(req: Request<{ name: string }>, res: Response): Promise<void> {
 const { name } = req.params;
 try {
   const result = await pool.query('SELECT * FROM users WHERE name = $1;', [name]);
   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json(result.rows[0]);
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}






//GET user by id
export async function getUserById(req: Request<{ id: string }>, res: Response): Promise<void> {
 const { id } = req.params;
 try {
   const result = await pool.query('SELECT * FROM users WHERE id = $1;', [id]);
   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json(result.rows[0]);
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}




//GET users by role
export async function getUsersByRole(req: Request<{ role: string }>, res: Response): Promise<void> {
 const { role } = req.params;
 try {
   const result = await pool.query('SELECT * FROM users WHERE role = $1;', [role]);
   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json(result.rows);
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}


//GET users by school
export async function getUsersBySchool(req: Request<{ school: string }>, res: Response): Promise<void> {
 const { school } = req.params;
 try {
   const result = await pool.query('SELECT * FROM users WHERE school = $1;', [school]);
   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json(result.rows[0]);
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}




//GET users by district
export async function getUsersByDistrict(req: Request<{ district: string }>, res: Response): Promise<void> {
 const { district } = req.params;
 try {
   const result = await pool.query('SELECT * FROM users WHERE school = $1;', [district]);
   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json(result.rows[0]);
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}






// POST (create) a new row
export async function createUser(
 req: Request<{}, {}, { name: string; email: string; phone_number:string; role:string; password_hash: string; school: string; district:string }>,
 res: Response
): Promise<void> {
 const {name, email, phone_number, role, password_hash, school, district } = req.body;
 try {
   const result = await pool.query(
     `INSERT INTO users (name, email, phone_number, role, password_hash, school, district)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
     [name, email, phone_number, role, password_hash, school, district]
   );
   res.status(201).json(result.rows[0]);
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}


// PUT (update) a user by field (not ID or timestamp)
export async function updateUser(
 req: Request<{ id: string }, {}, { name?: string; email?: string; phone_number?:string; role?:string; password_hash?: string; school?: string; district?:string }>,
 res: Response
): Promise<void> {
 const { id } = req.params;
 const { name, email, phone_number, role, password_hash, school, district } = req.body;


 try {
   const result = await pool.query(
     'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), phone_number = COALESCE($3, phone_number), role = COALESCE($4, role), password_hash = COALESCE($5, password_hash), school = COALESCE($6, school), district = COALESCE($7, district) WHERE id = $8 RETURNING *;',
     [name, email, phone_number, role, password_hash, school, district, id]
   );


   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json(result.rows[0]);
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}


// DELETE a row by id
export async function deleteUser(req: Request<{ id: string }>, res: Response): Promise<void> {
 const { id } = req.params;
 try {
   const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *;', [id]);
   if (result.rows.length === 0) {
     res.status(404).json({ error: 'Not found' });
   } else {
     res.json({ message: 'Deleted successfully', deleted: result.rows[0] });
   }
 } catch (error) {
   console.error(error);
   res.status(500).json({ error: 'Internal Server Error' });
 }
}
