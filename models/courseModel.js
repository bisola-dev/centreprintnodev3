const { DataTypes, Sequelize } = require('sequelize');
const sequelize = new Sequelize('nodeapp', 'root', '', {
  host: 'localhost',
  dialect: 'mysql'
});

const Courses = sequelize.define('courses', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    dept: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    clazz: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    ccode: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    ctitl: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    sessn: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    seme: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: true,
            notEmpty: true,
        }
    },
    starttime: {
        type: DataTypes.TIME, // Use TIME for time-only fields
        allowNull: false,
        validate: {
            notNull: true,
        }
    },
    endtime: {
        type: DataTypes.TIME, // Use TIME for time-only fields
        allowNull: false,
        validate: {
            notNull: true,
        }
    },
    proposeddate: {
        type: DataTypes.DATEONLY, // Assuming it's a date-only field
        allowNull: false,
        validate: {
            notNull: true,
        }
    }
}, {
    // Other options, such as timestamps
    timestamps: false
});

// Export the model to be used in other parts of your application
module.exports = Courses;
