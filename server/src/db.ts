import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// example query to test the connection. can be deleted later.
const result = await pool.query('SELECT NOW()');
console.log(result.rows);

export default pool;
