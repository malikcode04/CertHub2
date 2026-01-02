
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true // Required for running script
};

async function initDb() {
    console.log('🔄 Connecting to MySQL...');
    let connection;

    try {
        // Connect without DB selected first to create it
        connection = await mysql.createConnection(dbConfig);

        console.log('📂 Reading reset_db.sql...');
        const sqlPath = path.join(__dirname, 'reset_db.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('🚀 Executing SQL script...');
        await connection.query(sql);

        console.log('✅ Database initialized successfully!');
        console.log('   - Tables created: users, certificates, classes, platforms, etc.');
        console.log('   - Database: certhub');

    } catch (error) {
        console.error('❌ Database Initialization Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

initDb();
