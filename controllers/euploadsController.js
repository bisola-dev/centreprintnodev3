const multer = require('multer');
const express = require('express');
const pool = require('../database');
const moment = require('moment');
const path = require('path');
const app = express();
const fs = require('fs'); // Import the fs module

const session = require('express-session');

app.use(session({ secret: 'your_secret_key', resave: true, saveUninitialized: true }));


// Import userModel
const Course = require('../models/courseModel');
const Euploads = require('../models/euploadModel');
const getCurrentYear = () => {
    return new Date().getFullYear();
};



// Handle requests to '/' and '/index'
exports.renderIndex = (req, res) => {
    // Query the database to retrieve the list of courses
   Course.findAll({ attributes: ['ccode', 'clazz'] })
        .then(courses => {
            res.render('index', { courses, currentYear: getCurrentYear() });
        })
        .catch(err => {
            console.error('Error querying database:', err);
            res.status(500).send('Database error');
        });
};


// Handle user registration
exports.register = async (req, res) => {
    const { fulln, matno, exam } = req.body;

    // Perform form validation checks
    if (!fulln || !matno || !exam) {
        return res.send('<script>alert("Please fill in all fields."); history.back();</script>');
    }

    // Check if remaining time is already calculated and stored in the session
    const startTime = req.session.startTime;

    if (!startTime) {
        try {
            // Query the database to retrieve course information
            const course = await Course.findOne({ where: { ccode: exam } });

            if (!course) {
                return res.status(404).send('<script>alert("Table not found."); history.back();</script>');
            }

            // Extract relevant course information
            const { clazz, dept, sessn, seme, starttime, endtime, proposeddate } = course;

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
        let bisola = await Euploads.findAll({ where: { fulln } });

        // If bisola data not found, initialize an empty array
        if (!bisola) {
            bisola = [];
        }

            // Store bisola data in session
            req.session.bisola = bisola;

            // Redirect to the uploadexam page
            res.redirect('/uploadexam');

        } catch (error) {
            console.error('Error querying database:', error);
            return res.status(500).send('Error querying database');
        }
    } else {
        // Redirect to the uploadexam page
        res.redirect('/uploadexam');
    }
};

// Render upload exam page
exports.renderUploadExamPage = (req, res) => {
    // Retrieve session data
    const { userData, courseInfo, remainingTime, bisola } = req.session;

    // Check if session data exists
    if (!userData || !courseInfo || !bisola) {
        return res.status(400).send('<script>alert("Please use this platform appropriately, please do relogin."); window.location.href = "/";</script>');
    }

    // Extract fulln from userData
    const { fulln } = userData;

  

    // Query the database to retrieve euploads information
    Euploads.findAll({ where: { fulln } })
        .then(bisolaData => {
            // Render the page with session data and courseInfo

            //console.log('userData:', userData);
             //console.log('courseInfo:', courseInfo);
             //console.log('bisola:', bisola);
             //console.log('bisola:', bisolaData);
            res.render('uploadexam', { userData, courseInfo, bisola: bisolaData, remainingTime, currentYear: getCurrentYear() });
        })
        .catch(err => {
            console.error('Error querying euploads:', err);
            res.status(500).send('Database error');
        });
};

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

// Handle file upload route
exports.uploadFile = (req, res) => {
    try {
        console.log('Session Data:', req.session);
   
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

        // Retrieve hidden input values from the form
        const { bisola, userData, courseInfo } = req.body;

        // Parse the JSON strings to objects
        const bisolaData = JSON.parse(bisola);
        const userDataParsed = JSON.parse(userData);
        const courseInfoParsed = JSON.parse(courseInfo);

        // Extract necessary information from the parsed data
        const { fulln, matno, exam } = userDataParsed;

        // Generate file name
        const fileName = `${fulln}_${file.originalname}`;

        // Insert file details into database
        const dreg = moment().format('MMM D, YYYY h:mm A');

        // Example database insertion
        Euploads.create({ fulln, matno, courseid: exam, filelink: fileName, dreg })
            .then(() => {
                // Move the uploaded file to the appropriate directory
                const targetFilePath = path.join(__dirname, '..', 'docs', fileName);
                fs.renameSync(file.path, targetFilePath); // Use fs.renameSync to move the file

                const successMessage = 'File uploaded and inserted into database successfully.';
                // Construct the redirect URL with encoded query parameters
                const redirectUrl = `/subsuccess?successMessage=${encodeURIComponent(successMessage)}&bisola=${encodeURIComponent(JSON.stringify(bisolaData))}&userData=${encodeURIComponent(JSON.stringify(userDataParsed))}&courseInfo=${encodeURIComponent(JSON.stringify(courseInfoParsed))}`;

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
            });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).send('Internal server error');
    }
};


// Render submission success page
exports.renderSubmissionSuccessPage = (req, res) => {
    try {
        const { successMessage, bisola, userData, courseInfo } = req.query;

        // Check if session data exists
        if (!userData || !courseInfo || !bisola) {
            return res.status(400).send('Session data not found. Please login correctly.');
        }

        // Parse JSON strings back to objects
        const parsedBisola = JSON.parse(bisola);
        const parsedUserData = JSON.parse(userData);
        const parsedCourseInfo = JSON.parse(courseInfo);

        // Render the view with the success message and other parameters
        res.render('subsuccess', { successMessage, bisola: parsedBisola, userData: parsedUserData, courseInfo: parsedCourseInfo });
    } catch (error) {
        console.error('Error rendering submission success page:', error);
        res.status(400).send('Invalid JSON data.');
    }
};


// Handle session destruction and redirect to index
exports.logoutUser = (req, res) => {
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            console.log('Session destroyed successfully.');
        }
        // Redirect to index
        res.redirect('/');
    });
};