import { syncDatabase } from '../config/database.js';
import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up database with Sequelize...');

    // Force sync to recreate tables with correct schema
    console.log('🔄 Dropping and recreating tables...');
    await syncDatabase(true); // Force drop and recreate tables

    console.log('✅ Database tables synchronized successfully!');
    
    // Create a default admin user
    const adminEmail = 'admin@esds.co.in';
    
    try {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.create({
        email: adminEmail,
        password_hash: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      });
      
      console.log('✅ Default admin user created (admin@esds.co.in / admin123)');
    } catch (userError) {
      if (userError.name === 'SequelizeUniqueConstraintError') {
        console.log('ℹ️ Admin user already exists');
      } else {
        console.error('⚠️ Failed to create admin user:', userError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  }
};

// Run the setup
setupDatabase()
  .then(() => {
    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  });