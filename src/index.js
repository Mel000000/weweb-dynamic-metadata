#!/usr/bin/env node
import { processFiles } from "./core/file-processor.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Check if output is being piped
const isPiped = !process.stdout.isTTY;

// Export for programmatic use
export { processFiles };

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
    // Only show startup message if not piped
    if (!isPiped) {
        console.log('🚀 WeWeb Dynamic Metadata Generator\n');
    }
    
    processFiles()
        .then(result => {
            if (isPiped) {
                // If piped, output ONLY JSON
                console.log(JSON.stringify(result));
            } else {
                // If direct terminal, show pretty output
                console.log('\n╔' + '═'.repeat(48) + '╗');
                console.log('║' + '🎉 GENERATION COMPLETE'.padEnd(48) + '║');
                console.log('╟' + '─'.repeat(48) + '╢');
                console.log(`║   ⏱️  Duration: ${result.duration}s`.padEnd(50) + '║');
                console.log(`║   📊 Total entries: ${result.totalMetadataEntries}`.padEnd(50) + '║');
                console.log(`║   📁 Output: ${path.basename(result.outputDirectories[0])}`.padEnd(50) + '║');
                console.log('╚' + '═'.repeat(48) + '╝\n');
            }
            process.exit(0);
        })
        .catch(error => {
            if (isPiped) {
                // If piped, output error as JSON
                console.log(JSON.stringify({ error: error.message }));
            } else {
                console.error('\n❌ Generation failed:', error.message);
            }
            process.exit(1);
        });
}