import mysql from 'mysql2/promise';

// DATABASE_URL format: mysql://user:password@host:port/database
const dbUrl = process.env.DATABASE_URL;

let connectionConfig = {};

if (dbUrl) {
    try {
        const url = new URL(dbUrl);
        connectionConfig = {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
        };
    } catch (e) {
        console.error("Invalid DATABASE_URL", e);
    }
} else {
    connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ssjj',
    };
}

const pool = mysql.createPool({
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 1000, // 10s
});

// Auto-initialize table
const initDb = async () => {
    try {
        console.log('Attempting to connect to database at:', (connectionConfig as any).host);
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS User (
                id VARCHAR(191) PRIMARY KEY,
                data JSON,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        connection.release();
        console.log('Database initialized: User table checked/created.');
    } catch (err: any) {
        console.error('Database initialization failed:', err.message, err.code, err.address, err.port);
    }
};

// Run init (non-blocking)
initDb();

export default pool;
