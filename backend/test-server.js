// Test basic requirements
console.log('Testing server components...');

try {
  require('express');
  console.log('✓ Express loaded');
} catch (e) {
  console.log('✗ Express failed:', e.message);
}

try {
  require('cors');
  console.log('✓ CORS loaded');
} catch (e) {
  console.log('✗ CORS failed:', e.message);
}

try {
  require('puppeteer');
  console.log('✓ Puppeteer loaded');
} catch (e) {
  console.log('✗ Puppeteer failed:', e.message);
}

try {
  require('cheerio');
  console.log('✓ Cheerio loaded');
} catch (e) {
  console.log('✗ Cheerio failed:', e.message);
}

try {
  require('sqlite3');
  console.log('✓ SQLite3 loaded');
} catch (e) {
  console.log('✗ SQLite3 failed:', e.message);
}

try {
  require('dotenv').config();
  console.log('✓ Dotenv loaded');
  console.log('PORT:', process.env.PORT);
} catch (e) {
  console.log('✗ Dotenv failed:', e.message);
}

// Test SQLite database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'test.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log('✗ SQLite database connection failed:', err);
  } else {
    console.log('✓ SQLite database connected');
    db.close();
  }
});