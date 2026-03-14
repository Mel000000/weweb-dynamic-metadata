#!/usr/bin/env node
import { processFiles } from "./core/file-processor.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Simple console colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m'
};

// Helper to safely use colors
function colorize(text, color) {
    return colors[color] ? `${colors[color]}${text}${colors.reset}` : text;
}

console.log(`${colorize('🚀 WeWeb Dynamic Metadata Generator', 'cyan')}\n`);

// Handle the promise properly
if (import.meta.url === `file://${process.argv[1]}`) {
    processFiles()
        .then(result => {
            console.log(`\n${colorize('╔' + '═'.repeat(48) + '╗', 'magenta')}`);
            console.log(`${colorize('║', 'magenta')}${colorize('🎉 GENERATION COMPLETE'.padEnd(48), 'green')}${colorize('║', 'magenta')}`);
            console.log(`${colorize('╟' + '─'.repeat(48) + '╢', 'magenta')}`);
            console.log(`${colorize('║', 'magenta')}   ⏱️  Duration: ${result.duration}s`.padEnd(50) + `${colorize('║', 'magenta')}`);
            console.log(`${colorize('║', 'magenta')}   📊 Total entries: ${result.totalMetadataEntries}`.padEnd(50) + `${colorize('║', 'magenta')}`);
            console.log(`${colorize('║', 'magenta')}   📁 Output: ${path.basename(result.outputDirectories[0])}`.padEnd(50) + `${colorize('║', 'magenta')}`);
            console.log(`${colorize('╚' + '═'.repeat(48) + '╝', 'magenta')}\n`);
            
            process.exit(0);
        })
        .catch(error => {
            console.error(`\n${colorize('❌ Generation failed:', 'red')}`, error.message);
            console.error(error.stack);
            process.exit(1);
        });
}