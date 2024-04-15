// Import necessary modules
const { DataTypes, Sequelize } = require('sequelize');
const crypto = require('crypto');

// Create Sequelize instance
const sequelize = new Sequelize('nodeapp', 'root', '', {
  host: 'localhost',
  dialect: 'mysql'
});

// Define the model
const AdminLogin = sequelize.define('adminlogin', {
    fulln: {
        type: DataTypes.STRING,
        allowNull: false
    },
    usmal: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    timestamps: false, // Disable timestamps
    tableName: 'adminlogin' // Specify the table name explicitly
});

// Function to authenticate user
AdminLogin.authenticateUser = async (usmal, hash) => {
    try {
        // Hash the password
        const hpwd = crypto.createHash('md5').update(hash).digest('hex');

        // Find the user in the database
        const user = await AdminLogin.findOne({
            where: {
                usmal: usmal,
                hash: hpwd
            }
        });

        return user;
    } catch (error) {
        throw error;
    }
};

// Export the authenticateUser function and the model
module.exports = {
    authenticateUser: AdminLogin.authenticateUser,
    AdminLogin: AdminLogin
};
