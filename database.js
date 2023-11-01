const { Pool } = require('pg');

let dbPool;

if (process.env.DATABASE_URL) {
  // If the DATABASE_URL environment variable is set (as provided by Heroku), use it for the connection.
  dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required to accept the Heroku SSL certificate
    },
  });
} else {
  // If DATABASE_URL is not set, use the local database settings
  dbPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
}

dbPool.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = {
  dbPool,
};
