import { pool,initialize } from './db';
const handle=process.argv[2];
if(!handle||! /^[a-zA-Z0-9_-]{3,40}$/.test(handle))throw new Error('Usage: npm run admin -- existing_handle');
await initialize();
const result=await pool.query("UPDATE users SET role='admin' WHERE handle=?",[handle]);
await pool.end();
if(!result.affectedRows)throw new Error('Existing account not found');
console.log('Administrator role enabled for the specified existing account.');
