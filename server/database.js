const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'theater_booking',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get connection
async function getConnection() {
  return await pool.getConnection();
}

// Query helper
async function query(sql, values) {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, values);
    return results;
  } finally {
    connection.release();
  }
}

// Execute with transaction
async function executeTransaction(callback) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getConnection,
  query,
  executeTransaction
};
