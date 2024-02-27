const mysql = require('mysql2');
var conn = mysql.createConnection({
  host: 'localhost', 
  user: 'root',      
  password: '',     
  database: 'nodeapp'
}); 
conn.connect(function(err) {
  if (err) throw err;
  console.log('Database is connected successfully !');
});


const currentDate = new Date();
const dreg = currentDate.toLocaleString('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true
});
console.log(dreg);
const currentYear = new Date().getFullYear();


module.exports = conn;