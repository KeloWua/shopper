import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false } // Secured connection on the cloud
});

pool.connect()
    .then(client => {
        console.log("✅ PostgresSQL DATABASE connected successfully");
        client.release();
    })
    .catch(err => {
        console.error("❌ Error connecting to the DATABASE", err);
    });

export default pool;