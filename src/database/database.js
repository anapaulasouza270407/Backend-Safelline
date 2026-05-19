const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });

      // Test connection
      await this.pool.query('SELECT NOW()');
      console.log('💾 PostgreSQL connected successfully');

      // Create tables
      await this.initTables();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async initTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        imagePerfil VARCHAR(255) DEFAULT 'avatar1',
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(100) DEFAULT 'avatar1',
        is_online BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `;

    const createRoomsTable = `
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL
      )
    `;

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.pool.query(createUsersTable);
      await this.pool.query(createRoomsTable);
      await this.pool.query(createMessagesTable);
      console.log('✅ All tables created/verified');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  async query(text, params) {
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      const result = await this.pool.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Query error:', error.message);
      throw error;
    }
  }

  async get(text, params) {
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      const result = await this.pool.query(text, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Get error:', error.message);
      throw error;
    }
  }

  async run(text, params) {
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      const result = await this.pool.query(text + ' RETURNING id', params);
      return { id: result.rows[0]?.id };
    } catch (error) {
      console.error('❌ Run error:', error.message);
      throw error;
    }
  }

  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('💾 Database connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing database:', error.message);
    }
  }
}

module.exports = new Database();