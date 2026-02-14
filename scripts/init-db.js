const fs = require('fs');
const mysql = require('mysql2/promise');
const { URL } = require('url');

async function initDb() {
    try {
        let config = {
            multipleStatements: true,
            ssl: { rejectUnauthorized: false }
        };

        if (process.env.DATABASE_URL) {
            console.log('Parsing DATABASE_URL for connection...');
            const dbUrl = new URL(process.env.DATABASE_URL);
            config.host = dbUrl.hostname;
            config.port = dbUrl.port;
            config.user = dbUrl.username;
            config.password = dbUrl.password;
            config.database = dbUrl.pathname.substring(1); // remove leading '/'
        } else {
            console.log('Using individual environment variables...');
            config.host = process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost';
            config.port = parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306');
            config.user = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
            config.password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '167349943167';
            config.database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'mansion_pos';
        }

        console.log(`Connecting to ${config.host}:${config.port} as ${config.user}...`);
        const connection = await mysql.createConnection(config);
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
