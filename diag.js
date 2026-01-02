import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_HOST === 'localhost' ? undefined : { rejectUnauthorized: true }
};

const check = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [cols] = await connection.execute('DESCRIBE users');
        console.log("COLUMNS:");
        cols.forEach(c => console.log(c.Field));
        await connection.end();
    } catch (err) {
        console.error(err);
    }
};
check();
