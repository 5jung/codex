import mariadb from 'mariadb';
import fs from 'node:fs';
export const pool=mariadb.createPool({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??33306),user:process.env.DB_USER??'nursing',password:process.env.DB_PASSWORD,database:process.env.DB_NAME??'nursing',connectionLimit:5,bigIntAsNumber:true});
export async function initialize(){
 await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations(version INT PRIMARY KEY,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 await pool.query(`CREATE TABLE IF NOT EXISTS users(id VARCHAR(36) PRIMARY KEY,handle VARCHAR(40) NOT NULL UNIQUE,password_hash VARCHAR(256) NOT NULL,role ENUM('user','admin') NOT NULL DEFAULT 'user',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS sessions(token_hash CHAR(64) PRIMARY KEY,user_id VARCHAR(36) NOT NULL,expires_at DATETIME NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
 await pool.query(`CREATE TABLE IF NOT EXISTS facilities(id VARCHAR(80) PRIMARY KEY,source_data LONGTEXT NOT NULL,override_data LONGTEXT NOT NULL DEFAULT '{}')`);
 await pool.query(`CREATE TABLE IF NOT EXISTS reviews(id VARCHAR(36) PRIMARY KEY,facility_id VARCHAR(80) NOT NULL,author_id VARCHAR(36) NOT NULL,body VARCHAR(1000) NOT NULL,status ENUM('pending','published','hidden','deleted') NOT NULL DEFAULT 'pending',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(facility_id) REFERENCES facilities(id),FOREIGN KEY(author_id) REFERENCES users(id),INDEX(facility_id,status,created_at))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS corrections(id VARCHAR(36) PRIMARY KEY,facility_id VARCHAR(80) NOT NULL,author_id VARCHAR(36) NOT NULL,field_name VARCHAR(40) NOT NULL,suggested_value LONGTEXT NOT NULL,reason VARCHAR(1000) NOT NULL,status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(facility_id) REFERENCES facilities(id),FOREIGN KEY(author_id) REFERENCES users(id))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS reports(id VARCHAR(36) PRIMARY KEY,review_id VARCHAR(36) NOT NULL,author_id VARCHAR(36) NOT NULL,reason VARCHAR(500) NOT NULL,status ENUM('pending','resolved') NOT NULL DEFAULT 'pending',FOREIGN KEY(review_id) REFERENCES reviews(id),FOREIGN KEY(author_id) REFERENCES users(id),UNIQUE(review_id,author_id))`);
 await pool.query(`CREATE TABLE IF NOT EXISTS moderation_actions(id VARCHAR(36) PRIMARY KEY,actor_id VARCHAR(36) NOT NULL,target_id VARCHAR(36) NOT NULL,action VARCHAR(40) NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(actor_id) REFERENCES users(id))`);
 await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_hash CHAR(64) NULL');
 await pool.query('ALTER TABLE facilities ADD COLUMN IF NOT EXISTS source_url VARCHAR(255) NULL, ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE');
 await pool.query('INSERT IGNORE INTO schema_migrations(version) VALUES(2)');
 const data=JSON.parse(fs.readFileSync(new URL('../src/data/official.json',import.meta.url),'utf8'));
 const visitor=JSON.parse(fs.readFileSync(new URL('../src/data/visitor.json',import.meta.url),'utf8'));
 await syncFacilities([...data.facilities,...visitor.facilities],[...data.metadata.sources.map((s:any)=>s.sourceUrl),...visitor.facilities.map((f:any)=>f.sourceUrl)]);
 await pool.query('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()');
 await pool.query('INSERT IGNORE INTO schema_migrations(version) VALUES(1)');
}

export async function syncFacilities(facilities:any[],sources:string[]){
 if(!facilities.length||!sources.length)throw new Error('Refusing an empty source snapshot');
 const conn=await pool.getConnection();
 try{await conn.beginTransaction();
 for(const f of facilities)await conn.query('INSERT INTO facilities(id,source_data,source_url,is_active) VALUES (?,?,?,TRUE) ON DUPLICATE KEY UPDATE source_data=VALUES(source_data),source_url=VALUES(source_url),is_active=TRUE',[f.id,JSON.stringify(f),f.sourceUrl??null]);
 await conn.query(`UPDATE facilities SET is_active=FALSE WHERE source_url IN (${sources.map(()=>'?').join(',')}) AND id NOT IN (${facilities.map(()=>'?').join(',')})`,[...sources,...facilities.map(f=>f.id)]);
 await conn.commit();}catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
