const fs = require('fs');
const mysql = require('mysql2/promise');

async function initDb() {
    try {
        let connection;

        // Check for DATABASE_URL first (Railway Public/Private Networking)
        if (process.env.DATABASE_URL) {
            console.log('Connecting via DATABASE_URL...');
            connection = await mysql.createConnection({
                uri: process.env.DATABASE_URL,
                multipleStatements: true, // Crucial for init-db.sql
                ssl: {
                    rejectUnauthorized: false // Often needed for cloud DBs
                }
            });
        } else {
            // Fallback to individual variables
            console.log('Connecting via individual variables...');
            connection = await mysql.createConnection({
                host: process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
                port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306'),
                user: process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
                password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '167349943167',
                database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'mansion_pos',
                multipleStatements: true
            });
        }

        console.log('Connected to MySQL!');

        const sql = fs.readFileSync('init-db.sql', 'utf8');
        await connection.query(sql);

        console.log('Database initialized successfully!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
}

initDb();
