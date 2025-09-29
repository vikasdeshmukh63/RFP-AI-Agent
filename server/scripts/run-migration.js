#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Running Sequelize Migration...');

try {
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ Please run this script from the server directory');
    process.exit(1);
  }

  // Install dependencies if node_modules doesn't exist
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Run database setup
  console.log('🗄️ Setting up database...');
  execSync('npm run setup-db', { stdio: 'inherit' });

  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('🎉 Your Sequelize-based server is ready!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('  1. Configure your .env file');
  console.log('  2. Start the server: npm run dev');
  console.log('  3. Test the API endpoints');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}