#!/usr/bin/env node

const path = require('path');
const { run } = require('../src/index.js');

// Get the current working directory (where the user runs the command)
const projectRoot = process.cwd();

// Run the main function
run({ projectRoot, configPath }).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});