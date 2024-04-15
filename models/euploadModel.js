const { DataTypes, Sequelize } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize('nodeapp', 'root', '', {
  host: 'localhost',
  dialect: 'mysql'
});

// Define the model
const Euploads = sequelize.define('euploads', {
    fulln: {
        type: DataTypes.STRING,
        allowNull: false
    },
    matno: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filelink: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dreg: {
        type: DataTypes.STRING,
        allowNull: false
    },
    courseid: {
        type: DataTypes.INTEGER, // Assuming courseid is an integer
        allowNull: false
    },
    statuz: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // Default value of statuz is 0
    },
    ip: {
        type: DataTypes.STRING,
        defaultValue: null // Default value of ip is null
    }
}, {
    // Other options, such as timestamps
    timestamps: false
});

// Export the model
module.exports = Euploads;
