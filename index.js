const express = require("express");
require('dotenv').config();


const mysql = require('mysql2');
const app = express();

const password = process.env.DB_PASSWORD;

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));


const pool = mysql.createPool({
  host: '34.70.242.8',
  user: 'root',
  password: `${password}`,
  database: 'data',
});

app.get('/data', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return res.status(500).json({ error: 'Error connecting to MySQL' });
    }

    console.log('Connected to MySQL database.');

    // Fetch table names
    const showTablesQuery = 'SHOW TABLES';
    connection.query(showTablesQuery, (error, results) => {
      if (error) {
        console.error('Error fetching table names:', error);
        connection.release();
        return res.status(500).json({ error: 'Error fetching table names' });
      }

      const tableNames = results.map((row) => Object.values(row)[0]);

      const dataPromises = tableNames.map((tableName) => {
        return new Promise((resolve, reject) => {
          const selectQuery = `SELECT * FROM ${tableName}`;
          connection.query(selectQuery, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve({ tableName, data: results });
            }
          });
        });
      });

      Promise.all(dataPromises)
        .then((tableData) => {
          connection.release(); // Release the connection back to the pool
          res.json(tableData);
        })
        .catch((error) => {
          console.error('Error fetching table data:', error);
          connection.release();
          res.status(500).json({ error: 'Error fetching table data' });
        });
    });
  });
});

app.post('/users', (req, res) => {
  var user = req.body;

  // Check if the user exists
  pool.query('SELECT * FROM users WHERE userId = ?', [user.userId], function(err, results) {
    if (err) {
      console.error("Error:", err);
      return res.status(500).json({ error: 'Error connecting to MySQL' });
    }
    
    // If the user doesn't exist, insert the new user
    if (results.length === 0) {
      pool.query('INSERT INTO users SET ?', user, function(err, result) {
        if(err) {
          console.error("Error:", err);
          return res.status(500).json({ error: 'Error inserting user into MySQL' });
        }
        res.status(201).send('User added successfully');
      });
    } else {
      res.status(400).send('User already exists.');
    }
  });
});


app.listen(process.env.PORT || 3000, () =>
  console.log('App running on http://localhost:3000')
);
