// routes/admin.js

const express = require('express');
const router = express.Router();

// Import admin controller
const adminController = require('../controllers/adminController');

// Define routes for admin functionality
app.get('/adminlogin', adminController.adminlogin);
app.post('/register', adminController.register);
app.post('/admin-loggedin', adminController.adminloggedin);
app.get('/adminhome', adminController.adminhome);
app.get('/exam', adminController.Renderexam);
app.post('/regexam', adminController.regexam);
app.post('/view', adminController.view);
app.get('/download/:id', adminController.download);
app.post('/updateStatus',adminController.updateStatus);
app.post('/edit', adminController.edit);
app.post('/editExamType', adminController.editExamType);
app.post('/delete-course', adminController.delete-course);
app.get('/searchstudent',adminController.searchStudent);
app.post('/searchview',adminController.searchView);
app.get('/logout',adminController.logout);
// Add more routes as needed
module.exports = app;

