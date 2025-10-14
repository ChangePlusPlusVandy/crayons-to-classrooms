import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 5432,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./supabase-ca.crt').toString(),
  },
});

// example query to test the connection. can be deleted later.
const result = await pool.query('SELECT NOW()');
console.log(result.rows);

export default pool;
