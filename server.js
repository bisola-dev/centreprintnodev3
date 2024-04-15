const express = require('express');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const multer = require('multer'); // Add multer for handling file uploads

const { uploadFile, renderIndex, register, renderUploadExamPage, renderSubmissionSuccessPage, logoutUser } = require('./controllers/euploadsController');
const { renderAdminLogin,adminloggedin,renderAdminHome,regexam,view,Renderexam,download,updateStatus, edit, editExamType, deleteCourse, searchStudent, searchView, logoutAdmin } = require('./controllers/adminController');
 
const app = express();
const port = 3002;

// Middleware setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your_secret_key', resave: true, saveUninitialized: true }));
app.use(cookieParser());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'docs','public')));

// Set up multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'docs/'); // Destination folder for uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use the original filename
    }
});

const upload = multer({ storage: storage });

// Serve static files from the 'docs' directory
app.use(express.static(path.join(__dirname, 'docs')));

//route for admin login
app.get('/adminlogin', renderAdminLogin);

//route for admin login verification
app.post('/admin-loggedin', adminloggedin);

//route for admin home
app.get('/adminhome', renderAdminHome);

//route for registering an exam
app.post('/regexam', regexam);


//route for rendering an exampage
app.get('/exam', Renderexam);

//route for viewing submitted students for each course
app.post('/view', view);

//route for  download
app.get('/download/:id', download);

//route for updatestatus after download
app.post('/updateStatus', updateStatus);

//route for editing schedule.
app.post('/edit', edit);

//route for edit exam type
app.post('/editExamType', editExamType);

//route deletion of course.
app.post('/delete-course', deleteCourse);

//route for student search.
app.get('/searchstudent', searchStudent);

//route for search view
app.post('/searchview', searchView);

//route for log out.
app.get('/logout', logoutAdmin);



app.get('/', renderIndex);
app.get('/index', renderIndex);

// Route for handling user registration
app.post('/register', register);

// Route for rendering upload exam page
app.get('/uploadexam', renderUploadExamPage);

// Handle file upload route
app.post('/uploadfile', upload.single('filelink'), uploadFile); // Use upload.single middleware to handle file uploads

// Route for rendering success page
app.get('/subsuccess', renderSubmissionSuccessPage);

// Route for rendering logout page
app.get('/exit', logoutUser);



// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
