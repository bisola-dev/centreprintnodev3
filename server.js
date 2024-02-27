const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');



const mysql = require('mysql');
const fs = require('fs');
const moment = require('moment');


const app = express();
const port = 3002;

const pool = require('./database');

// Middleware setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your_secret_key', resave: true, saveUninitialized: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'docs','public')));

const getCurrentYear = () => {
    return new Date().getFullYear();
};



   app.get('/', (req, res) => {
    // Query the database to retrieve the list of courses
    pool.query('SELECT ccode, clazz FROM courses', (err, result) => {
        if (err) {
            // Handle database error
            return res.status(500).send('Database error');
        }
        // Render the index template with the list of courses
        res.render('index', { courses: result,currentYear: getCurrentYear()});
    });
});



app.get('/index', (req, res) => {
    // Query the database to retrieve the list of courses
    pool.query('SELECT ccode, clazz FROM courses', (err, result) => {
        if (err) {
            // Handle database error
            return res.status(500).send('Database error');
        }
        // Render the index template with the list of courses
        res.render('index', { courses: result,currentYear: getCurrentYear()});
    });
});


app.get('/adminlogin', (req, res) => {
    res.render('adminlogin'); // Render the index.ejs template
});

// Add cookie parser middleware
app.use(cookieParser());

app.post('/register', (req, res) => {
    const { fulln, matno, exam } = req.body;

    // Perform form validation checks
    if (!fulln || !matno || !exam) {
        return res.send('<script>alert("Please fill in all fields."); history.back();</script>');
    }

    // Initialize session and retrieve remaining time if it exists
    let remainingTime = req.session.remainingTime || 0;
    const startTime = req.session.startTime;

    // Check if remaining time is already calculated and stored in the session
    if (!startTime) {
        // Query the database to retrieve course information
        pool.query('SELECT * FROM courses WHERE ccode = ?', [exam], (err, result) => {
            if (err) {
                console.error('Error querying database:', err);
                return res.status(500).send('Database error');
            }

            if (result.length === 0) {
                return res.status(404).send('<script>alert("Table not found."); history.back();</script>');
            }

            // Extract relevant course information
            const { clazz, dept, sessn, seme, starttime, endtime, proposeddate } = result[0];

            // Get the current time in hours and minutes format
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const currentTime = `${hours}:${minutes}`;

            // Convert start time and end time to minutes
            const [startHours, startMinutes] = starttime.split(':').map(Number);
            const startTimeInMinutes = startHours * 60 + startMinutes;

            const [endHours, endMinutes] = endtime.split(':').map(Number);
            const endTimeInMinutes = endHours * 60 + endMinutes;

            // Calculate current time in minutes
            const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

            // Calculate remaining time in minutes
            let remainingTime = endTimeInMinutes - currentTimeInMinutes;

            // Ensure remainingTime is not negative
            remainingTime = Math.max(remainingTime, 0);
            // Convert remaining time from minutes to seconds
             remainingTime *= 60;



            // Log start time, end time, and remaining time
            console.log('Start Time:', starttime);
            console.log('End Time:', endtime);
            console.log('Remaining Time (Minutes):', remainingTime);

            // Store userData, courseInfo, and remainingTime in session variables
            req.session.userData = { fulln, matno, exam };
            req.session.courseInfo = { clazz, dept, sessn, seme, starttime, endtime, proposeddate };
            req.session.remainingTime = remainingTime;

            // Set a cookie for the remaining time
            res.cookie('remainingTime', remainingTime, { maxAge: remainingTime * 1000 });

            // Perform exam schedule checks
            const currentDate = new Date().toISOString().split('T')[0];
            if (currentDate !== proposeddate) {
                const reportalert = "This exam is not scheduled for today";
                return res.send(`
                    <script type="text/javascript">
                        alert('This exam is not scheduled for today.');
                        window.location.href='/index';
                    </script>
                `);
            } else if (currentTime < starttime) {
                const reportalert = "This is not the scheduled time for this exam, please check back later";
                return res.send(`
                    <script type="text/javascript">
                        alert('This is not the scheduled time for this exam, please check back later');
                        window.location.href='/index';
                    </script>
                `);
            } else if (remainingTime <= 0) {
                // Exam has already ended
                return res.send(`
                    <script type="text/javascript">
                        alert('You can no longer attempt this exam. This exam has already ended.');
                        window.location.href='/index';
                    </script>
                `);
            } else if (remainingTime <= 15) {
                // Less than or equal to 15 minutes remaining
                const minutesLeft = remainingTime; // Remaining time in minutes
                // Do something with minutesLeft if needed
            }

            // Query the database to retrieve euploads information
            pool.query('SELECT * FROM euploads WHERE fulln = ?', [fulln], (err, bisola) => {
                if (err) {
                    console.error('Error querying euploads:', err);
                    return res.status(500).send('Database error');
                }

                // Store bisola data in session
                req.session.bisola = bisola;

                // Redirect to the uploadexam page
                res.redirect('/uploadexam');
            });
        });
    } else {
        // Redirect to the uploadexam page
        res.redirect('/uploadexam');
    }
});



app.get('/uploadexam', (req, res) => {
    // Retrieve session data
    const { userData, courseInfo, remainingTime, bisola} = req.session;

    // Check if session data exists
    if (!userData || !courseInfo|| !bisola) {
        return res.status(400).send('<script>alert("please use this platform appropriately,please do relogin"); window.location.href = "/";</script>');
    }
     // Extract fulln from userData
    const { fulln } = userData;

    // Query the database to retrieve euploads information
    pool.query('SELECT * FROM euploads WHERE fulln = ?', [fulln], (err, bisolaData) => {
        if (err) {
            console.error('Error querying euploads:', err);
            return res.status(500).send('Database error');
        }
  
    // Render the page with session data and courseInfo
    res.render('uploadexam', {userData, courseInfo,bisola:bisolaData,remainingTime,currentYear: getCurrentYear() });
});
});


// Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'docs/'); // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
      const { fulln, matno, exam } = req.session.userData; // Get session data
      const fileName = fulln + '_' + file.originalname; // Append username to filename
      cb(null, fileName);
    }
  });
  
  const upload = multer({ storage: storage });

 // Handle file upload
 app.post('/uploadfile', upload.single('filelink'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send('<script>alert("Please upload a file."); history.back();</script>');
    }

    const fileSize = file.size;
    if (fileSize > 90000) { 
        return res.status(400).send('<script>alert("Sorry, your file is too large, it should be less than 90kb."); history.back();</script>');
    }

    const allowTypes = ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'html', 'cdr', 'pub', 'pubx', 'mdb', 'accdb', 'pmd'];
    const fileType = path.extname(file.originalname).slice(1);
    if (!allowTypes.includes(fileType)) {
        return res.status(400).send('<script>alert("Invalid file type."); history.back();</script>');
    }
     

    // Retrieve session data
    const bisola = req.session.bisola;
    const userData = req.session.userData;
    const courseInfo = req.session.courseInfo;

    //console.log('Bisola:', bisola);
    //console.log('User Data:', userData);
    //console.log('Course Info:', courseInfo);
    

    // Extract file details
    const { fulln, matno, exam } = userData; // Use userData retrieved from session

    // Generate file name
    const fileName = fulln + '_' + file.originalname;

    // Insert file details into database
    const targetFilePath = path.join(__dirname, 'docs', fileName);
    const dreg = moment().format('MMM D, YYYY h:mm A');

    // Example database insertion
    // Replace this with your database logic
    // Assuming you have a database connection pool named 'pool'
    pool.query('INSERT INTO euploads (fulln, matno, courseid, filelink, dreg) VALUES (?, ?, ?, ?, ?)', [fulln, matno, exam, fileName, dreg], (err, result) => {
        if (err) {
            console.error('Error inserting file into database:', err);
            return res.status(500).send('Database error');
        }
        else {
            const successMessage = 'File uploaded and inserted into database successfully.';
            // Construct the redirect URL with encoded query parameters
            const redirectUrl = `/subsuccess?successMessage=${encodeURIComponent(successMessage)}&bisola=${encodeURIComponent(JSON.stringify(bisola))}&userData=${encodeURIComponent(JSON.stringify(userData))}&courseInfo=${encodeURIComponent(JSON.stringify(courseInfo))}`;
            
            // Construct the HTML content with JavaScript for the alert and redirection
            const script = `
                <script>
                    // Display alert with the success message
                    alert("${successMessage}");
                    // Redirect to the specified URL after the alert is dismissed
                    window.location.href = "${redirectUrl}";
                </script>
            `;
            
            // Send the HTML content with the script
            res.send(script);
        }  
    });     
        
    });
 

app.get('/subsuccess', (req, res) => {
    const { successMessage, bisola, userData, courseInfo } = req.query;

    // Check if session data exists
    if (!userData || !courseInfo|| !bisola) {
        return res.status(400).send('Session data not found.please login correctly');
    } 

    // Parse JSON strings back to objects
    let parsedBisola, parsedUserData, parsedCourseInfo;
    try {
        parsedBisola = JSON.parse(bisola);
        parsedUserData = JSON.parse(userData);
        parsedCourseInfo = JSON.parse(courseInfo);
    } catch (error) {
        return res.status(400).send('Invalid JSON data.');
    }

    // Render the view with the success message and other parameters
    res.render('subsuccess', { successMessage, bisola: parsedBisola, userData: parsedUserData, courseInfo: parsedCourseInfo });
});



app.get('/exit', (req, res) => {
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            console.log('Session destroyed successfully.');
        }
        // Redirect to index.php
        res.redirect('/');
    });
});


// GET route for the admin login page
app.get('/adminlogin', (req, res) => {
    res.render('adminlogin');
});


app.post('/admin-loggedin', (req, res) => {
    const { usmal, hash } = req.body;

    // Perform form validation checks
    if (!usmal || !hash) {
        return res.send('<script>alert("Please fill in all fields."); history.back();</script>');
    }

    // Hash the password
    const hpwd = crypto.createHash('md5').update(hash).digest('hex');

    // Query the database to retrieve login details
    pool.query('SELECT * FROM adminlogin WHERE usmal = ? AND hash = ?', [usmal, hpwd], (err, adminData) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Database error');
        }

        if (adminData.length === 0) {
            return res.status(404).send('<script>alert("The username and password provided is invalid, please retry correctly."); history.back();</script>');
        }

        // Extract relevant admin information
        const { usmal, fulln } = adminData[0];

        // Store adminData in session variables
        req.session.adminData = { usmal, fulln };

        // Construct the success message with the username
        const successMessage = `Congratulations, ${fulln}! You have successfully logged in.`;

       // Set success message in session
       req.session.successMessage = successMessage;

       // Send a response to the client indicating successful login
       res.send(`<script>alert("${successMessage}"); window.location.href = "/adminhome";</script>`);
   });
});



  app.get('/adminhome', (req, res) => {
    const { usmal, fulln } = req.session.adminData;
    fs.readFile(path.join(__dirname, 'views', 'adminsidebar.ejs'), 'utf8', (err, adminsidebarContent) => {
        if (err) {
            console.error('Error reading adminsidebar file:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (!usmal || !fulln) {
            // If adminData doesn't exist, redirect to login page
            return res.redirect('/admin-login');
        }
  res.render('adminhome',{adminsidebarContent, adminData:req.session.adminData,currentYear: getCurrentYear() });
    });
  });


app.get('/exam', (req, res) => {
    // Fetch data from the database
  pool.query('SELECT * FROM courses ORDER BY ccode ASC', (err, rows) => {
      if (err) throw err;
      // Render the 'exam' template and pass the fetched data to it
      res.render('exam', { courses: rows,currentYear: getCurrentYear() });

    });
  });


app.post('/regexam', (req, res) => {
    const { dept, clazz, ccode, ctitl, sessn, seme, exdate, starttime, endtime } = req.body;
  
    const query = `SELECT * FROM courses WHERE ccode = '${ccode}'`;
pool.query(query, (err, result) => {
      if (err) throw err;
  
      if (dept === "" || clazz === "" || ccode === "" || ctitl === "" || sessn === "" || seme === "" || exdate === "" || starttime === "" || endtime === "") {
        res.send(`<script>alert('do not submit an empty form'); history.back(); </script>`);
      } else if (result.length > 0) {
        res.send(`<script>alert('Please check the course has already been saved'); history.back();</script>`);
      } else {
        const newCourseQuery = `INSERT INTO courses (dept, clazz, ccode, ctitl, sessn, seme, starttime, endtime, proposeddate) 
                                VALUES ('${dept}', '${clazz}', '${ccode}', '${ctitl}', '${sessn}', '${seme}', '${starttime}', '${endtime}', '${exdate}')`;
pool.query(newCourseQuery, (err, result) => {
          if (err) {
            res.send(`<script>alert('Course unadded please retry.'); history.back();</script>`);
          } else {
            res.send(`<script>alert('Courses successfully saved'); window.location.href='/exam';</script>`);
          }
        });
      }
    });
  });

 

  app.post('/view', (req, res) => {
    const { crease2, sessn2, ccode2, dept2 } = req.body;
    // Use the data as needed
    pool.query('SELECT * FROM euploads WHERE courseid = ? ORDER BY fulln ASC', [ccode2], (err, result) => {
        if (err) {
            // Handle error
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
        // Render your page with the result data
        res.render('view', { bissy: result, currentYear: getCurrentYear() });
    });
});

// Define a route to handle file downloads
app.get('/download/:id', (req, res) => {
    const fileId = req.params.id;

    // Retrieve the file details from the database based on fileId
    // Replace this with your database logic
    pool.query('SELECT * FROM euploads WHERE id = ?', [fileId], (err, result) => {
        if (err) {
            console.error('Error retrieving file details:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Check if any data was retrieved
        if (result.length === 0) {
            console.error('No file details found for ID:', fileId);
            return res.status(404).send('File not found');
        }

        // Assuming the file details are available in the first row of the result
        const fileDetails = result[0];

        // Construct the file path
        const filePath = path.join(__dirname, 'docs', fileDetails.filelink);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Provide the file for download
            res.download(filePath, fileDetails.filelink);
        } else {
            // File not found
            console.error('File not found:', filePath);
            res.status(404).send('File not found');
        }
    });
});



app.post('/updateStatus', (req, res) => {
    const { id } = req.body;

    // Parse the ID as an integer
    const candidateId = parseInt(id);

    // Validate to ensure it's a valid integer
    if (isNaN(candidateId) || !Number.isInteger(candidateId)) {
        return res.status(400).send("Invalid request: Candidate ID should be a valid integer.");
    }

    // Update the database using prepared statement
    const query = "UPDATE euploads SET statuz = 1 WHERE id = ?";
    pool.query(query, [candidateId], (err, result) => {
        if (err) {
            console.error("Error updating record:", err);
            return res.status(500).send("Error updating record. Please try again later.");
        }
        res.send("Success");
    });
});


app.post('/edit', (req, res) => {
    // Extract data from the request body
    const { crease3, dept3, clazz3, ccode3, ctitl3, sessn3, seme3, exdate, examstart, examend } = req.body;

    // Render your page with the result data
    res.render('edit', { crease3, dept3, clazz3, ccode3, ctitl3, sessn3, seme3, exdate, examstart, examend, currentYear: getCurrentYear() });
});



    app.post('/edit-examtype', (req, res) => {
        // Extract data from the request body
        const { crease3, exdate, starttime, examend } = req.body;
    
        // Check if any of the required fields is empty
        if (!exdate || !starttime || !examend) {    
        return res.send(`<script>alert('Please do not submit an empty form');</script>`);
        }
    
        // Perform the database update
        const updateQuery = `UPDATE courses SET starttime='${starttime}', endtime='${examend}', proposeddate='${exdate}' WHERE id=${crease3}`;
    
        // Assuming you have a database connection pool named 'pool'
        pool.query(updateQuery, (err, result) => {
            if (err) {
                return res.send(`<script>alert('Details update unsuccessful. Please retry.');history.back();</script>`);
            }
            return res.send(`<script>alert('Details successfully updated');window.location.href = '/exam';</script>`);
        });
    });
    

    
// Assuming 'app' is your Express application instance
app.post('/delete-course', (req, res) => {
    const crease3 = req.body.crease3;

    // Check if the crease3 value is valid (not empty or undefined)
    if (!crease3) {
        const errorMessage = "<script>alert('Invalid request. Please provide a valid course ID.');</script>";
        return res.status(400).send(errorMessage);
    }

    // Perform the deletion logic (replace this with your actual database logic)
    // Assuming you have a database connection pool named 'pool'
    const deleteQuery = `DELETE FROM courses WHERE id = ${crease3}`;

    pool.query(deleteQuery, (err, result) => {
        if (err) {
            console.error('Error deleting course:', err);
            // Display an alert message instead of setting it to a constant
            return res.status(500).send("<script>alert('Error deleting course. Please try again.');history.back();</script>");
        }

        // Display a success alert message
        return res.status(200).send("<script>alert('Course successfully deleted.');window.location.href = '/exam';</script>");
    });
});


app.get('/searchstudent', (req, res) => {
    const adminData = req.session.adminData;
    res.render('searchstudent',{adminData:req.session.adminData,currentYear: getCurrentYear() }); 
});



app.post('/searchview', (req, res) => {
    // Extract the search query from the request body
    const { lame } = req.body;

    // Check if the search query is provided
    if (!lame) {
        return res.status(400).send("Search query is missing.");
    }

    // Construct the SQL query to search for records
    const query = `SELECT * FROM euploads WHERE fulln LIKE '%${lame}%'`;

    // Execute the SQL query
    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).send("Internal server error");
        }

        // Check if any results were found
        if (results.length === 0) {
            // Send an alert message to the client if no results were found
            return res.send("<script>alert('No results found');history.back();</script>");
        }

        // Render the searchview template with search results
        res.render('searchview', { bissy: results, lame: lame ,currentYear: getCurrentYear()});
    });
});



  app.get('/logout', (req, res) => {
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            console.log('Session destroyed successfully.');
        }
        // Redirect to index.php
        res.redirect('/adminlogin');
    });
});



// Start the server
app.listen(port, () => {
    console.log(`Node.js server is running at http://localhost:${port}`);
});
