import { initialize,pool } from './db';
await initialize();await pool.end();console.log('Schema v1 and official source import complete.');
