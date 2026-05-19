require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
  .then(() => {
    console.log('✅ Coluna adicionada!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });