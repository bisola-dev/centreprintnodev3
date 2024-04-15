// routes/user.js
const multer = require('multer');
const path = require('path');
const moment = require('moment');
const express = require('express');

// Import user controller
const euploadsController = require('../controllers/euploadsController');

// Define routes for user functionality
app.get('/index', euploadsController.renderIndex);
app.post('/register', euploadsController.register);
app.get('/uploadexam', euploadsController.renderUploadExamPage);
app.post('/uploadfile', euploadsController.uploadFile); // Use the controller method directly
app.get('/subsuccess', euploadsController.renderSubmissionSuccessPage);
app.get('/exit', euploadsController.logoutUser);
// Add more routes as needed

module.exports = app;
