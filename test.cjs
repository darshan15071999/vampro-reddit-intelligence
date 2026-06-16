const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/vampro.sqlite');
db.run(
  "INSERT INTO queries (id, workspace_id, query, intent, category, generation_method) VALUES (?, ?, ?, ?, ?, ?)",
  ['query_test', 'default', 'test', 'Informational', 'Brand', 'Manual'],
  function (err) {
    if (err) console.error('Error inserting query:', err.message);
    else console.log('Successfully inserted query');
  }
);
