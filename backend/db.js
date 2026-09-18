const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'jim123', // আপনার MySQL root password থাকলে এখানে দিন
  database: 'hasan_jim_db',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = db;