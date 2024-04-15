const express = require('express');
const pool = require('../database');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const app = express();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views', 'adminsidebar.ejs'));
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'docs','public')));

// Import adminlogin model
const { authenticateUser, AdminLogin } = require('../models/adminloginModel');
const Course = require('../models/courseModel');
const Euploads = require('../models/euploadModel');


const getCurrentYear = () => {
    return new Date().getFullYear();
};


// GET route for the admin login page
exports.renderAdminLogin = (req, res) => {
    res.render('adminlogin');
};


// POST route for admin login authentication
exports.adminloggedin = async (req, res) => {
    const { usmal, hash } = req.body;

    // Perform form validation checks
    if (!usmal || !hash) {
        return res.send('<script>alert("Please fill in all fields."); history.back();</script>');
    }

    try {
        // Authenticate user using AdminLogin model
        const adminData = await AdminLogin.authenticateUser(usmal, hash);

        if (!adminData) {
            return res.status(404).send('<script>alert("Invalid username or password."); history.back();</script>');
        }

        // Store adminData in session variables
        req.session.adminData = { usmal: adminData.usmal, fulln: adminData.fulln };

        // Construct the success message with the username
        const successMessage = `Congratulations, ${adminData.fulln}! You have successfully logged in.`;

        // Set success message in session
        req.session.successMessage = successMessage;

        // Redirect to the admin home page 
     res.send(`<script>alert("${successMessage}"); window.location.href='/adminhome';</script>`);
    } catch (error) {
        console.error('Error authenticating user:', error);
        return res.status(500).send('<script>alert("Database error."); history.back();</script>');
    }
};


// Render Admin Home Page
exports.renderAdminHome = (req, res) => {
    // Check if adminData exists in session and has required fields
    if (!req.session.adminData || !req.session.adminData.usmal || !req.session.adminData.fulln) {
        // If adminData doesn't exist or is incomplete, redirect to login page
        return res.redirect('/adminlogin');
    }

    const { usmal, fulln } = req.session.adminData;
    //console.log('Admin email:', usmal);
    //console.log('Admin full name:', fulln);

    // Read adminsidebar file
    fs.readFile(path.join(__dirname, '..', 'views', 'adminsidebar.ejs'), 'utf8', (err, adminsidebarContent) => {
        if (err) {
            console.error('Error reading adminsidebar file:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Fetch data from the database for the 'exam' template using Sequelize
        Course.findAll({ order: [['ccode', 'ASC']] })
            .then(courses => {
                // Render the 'exam' template and pass the fetched data to it
                res.render('exam', { 
                    courses, 
                    adminsidebarContent, 
                    adminData: req.session.adminData, 
                    currentYear: getCurrentYear() 
                });
            })
            .catch(error => {
                console.error('Error fetching courses for exam:', error);
                return res.status(500).send('Internal Server Error');
            });
    });
};

exports.Renderexam = async (req, res) => {
    try {
        // Fetch data from the database using Sequelize
        const courses = await Course.findAll({ 
            order: [['ccode', 'ASC']], 
            attributes: ['id', 'dept', 'clazz', 'ccode', 'ctitl', 'sessn', 'seme', 'starttime', 'endtime', 'proposeddate'] 
        });

        // Log the courses array
       // console.log('Courses:', courses);
        // Ensure courses array is passed correctly to the template
console.log('Courses in template:', courses);


        // Render the 'exam' template and pass the fetched data to it
        res.render('exam', { courses, currentYear: getCurrentYear() });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).send('Internal Server Error');
    }
};



// Add new course
exports.regexam = async (req, res) => {
    const { dept, clazz, ccode, ctitl, sessn, seme, exdate, starttime, endtime } = req.body;

    // Check if any required field is empty
    if (!dept || !clazz || !ccode || !ctitl || !sessn || !seme || !exdate || !starttime || !endtime) {
        return res.send(`<script>alert('Please do not submit an empty form'); history.back();</script>`);
    }

    try {
        // Check if the course already exists
        const existingCourse = await Course.findOne({ where: { ccode } });
        if (existingCourse) {
            return res.send(`<script>alert('Please check if the course has already been saved'); history.back();</script>`);
        }

        // Create the new course
        await Course.create({
            dept,
            clazz,
            ccode,
            ctitl,
            sessn,
            seme,
            starttime,
            endtime,
            proposeddate: exdate
        });

        return res.send(`<script>alert('Course successfully saved'); window.location.href='/exam';</script>`);
    } catch (error) {
        console.error('Error adding new course:', error);
        return res.send(`<script>alert('Course unadded please retry.'); history.back();</script>`);
    }
};

// View uploaded files for a specific course
exports.view = async (req, res) => {
    const { crease2, sessn2, ccode2, dept2 } = req.body;
    try {
        // Fetch uploaded files for the specified course from the database
        const files = await Euploads.findAll({ where: { courseid: ccode2 }, order: [['fulln', 'ASC']] });
        // Render the 'view' template with the fetched data
        res.render('view', { bissy: files, currentYear: getCurrentYear() });
    } catch (error) {
        console.error('Error fetching uploaded files:', error);
        return res.status(500).send('Internal Server Error');
    }
};

// Route to handle file downloads
exports.download = async (req, res) => {
    const fileId = req.params.id;
     // Log fileId to see its value
     console.log('File ID:', fileId);

    try {
        // Retrieve the file details from the database based on fileId
        const fileDetails = await Euploads.findByPk(fileId);

        // Check if any data was retrieved
        if (!fileDetails) {
            console.error('No file details found for ID:', fileId);
            return res.status(404).send('File not found');
        }

        // Construct the file path
        const filePath = path.join(__dirname, '..', 'docs', fileDetails.filelink);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            console.log('fileDetails:', fileDetails.filelink);
            // Provide the file for download
            res.download(filePath, fileDetails.filelink);
        } else {
            // File not found
            console.error('File not found:', filePath);
            res.status(404).send('File not found');
        }
    } catch (error) {
        console.error('Error retrieving file details:', error);
        return res.status(500).send('Internal Server Error');
    }
};

// Update candidate status
exports.updateStatus = async (req, res) => {
    const { id } = req.body;

    try {
        // Find the Eupload record by ID
        const euploads = await Euploads.findByPk(id);

        // Check if the record exists
        if (!euploads) {
            return res.status(404).send("Record not found");
        }

        // Update the 'statuz' attribute to 1
        euploads.statuz = 1;

        // Save the changes to the database
        await euploads.save();

        // Send success response
        res.send("Success");
    } catch (error) {
        console.error("Error updating record:", error);
        res.status(500).send("Error updating record. Please try again later.");
    }
};

// Render edit page
exports.edit = (req, res) => {
    // Extract data from the request body
    const { crease3, dept3, clazz3, ccode3, ctitl3, sessn3, seme3, exdate, examstart, examend } = req.body;

    // Log the extracted values
    console.log('Extracted values:', { crease3, dept3, clazz3, ccode3, ctitl3, sessn3, seme3, exdate, examstart, examend });

    // Render your page with the result data
    res.render('edit', { crease3, dept3, clazz3, ccode3, ctitl3, sessn3, seme3, exdate, examstart, examend, currentYear: getCurrentYear() });
};


// Update exam type
exports.editExamType = async (req, res) => {
    // Extract data from the request body
    const { crease3, exdate, starttime, examend } = req.body;

    // Check if any of the required fields is empty
    if (!exdate || !starttime || !examend) {
        return res.send(`<script>alert('Please do not submit an empty form');</script>`);
    }

    try {
        // Update the course details
        const [updatedRows] = await Course.update(
            { starttime, endtime: examend, proposeddate: exdate },
            { where: { id: crease3 } }
        );

        if (updatedRows === 0) {
            // If no rows were updated, return an error message
            console.error('No rows were updated.');
            return res.send(`<script>alert('Details update unsuccessful. Please retry.');history.back();</script>`);
        }

        console.log(`${updatedRows} row(s) updated successfully.`);
        return res.send(`<script>alert('Details successfully updated');window.location.href = '/exam';</script>`);
    } catch (error) {
        console.error("Error updating record:", error);
        return res.send(`<script>alert('Details update unsuccessful. Please retry.');history.back();</script>`);
    }
};


// Delete course
exports.deleteCourse = async (req, res) => {
    const { crease3 } = req.body;

    // Check if the crease3 value is valid (not empty or undefined)
    if (!crease3) {
        return res.status(400).send("<script>alert('Invalid request. Please provide a valid course ID.');</script>");
    }

    try {
        // Delete the course
        const deletedRows = await Course.destroy({ where: { id: crease3 } });

        if (deletedRows === 0) {
            // If no rows were deleted, return an error message
            return res.status(404).send("<script>alert('Course not found.');history.back();</script>");
        }

        return res.status(200).send("<script>alert('Course successfully deleted.');window.location.href = '/exam';</script>");
    } catch (error) {
        console.error('Error deleting course:', error);
        return res.status(500).send("<script>alert('Error deleting course. Please try again.');history.back();</script>");
    }
};

// Search for student
exports.searchStudent = (req, res) => {
    const adminData = req.session.adminData;
    res.render('searchstudent', { adminData: req.session.adminData, currentYear: getCurrentYear() });
};

// Search and view uploaded files
const { Op } = require('sequelize');
exports.searchView = async (req, res) => {
    // Extract the search query from the request body
       // Extract the search query from the request body
       const { lame } = req.body;

       try {
           // Check if the search query is provided
           if (!lame) {
               return res.status(400).send("Search query is missing.");
           }
   
           // Search for records using Sequelize model method
           const results = await Euploads.findAll({
               where: {
                   fulln: {
                       [Op.like]: `%${lame}%` // Search for fulln containing the search query
                   }
               }
           });
   
           // Check if any results were found
           if (results.length === 0) {
               // Send an alert message to the client if no results were found
               return res.send("<script>alert('No results found');history.back();</script>");
           }
   
           // Render the searchview template with search results
           res.render('searchview', { bissy: results, lame: lame, currentYear: getCurrentYear() });
       } catch (error) {
           console.error("Error executing query:", error);
           return res.status(500).send("Internal server error");
       }
   };
   


// Logout
exports.logoutAdmin = (req, res) => {
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
};







