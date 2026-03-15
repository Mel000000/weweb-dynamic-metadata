#!/usr/bin/env node
import { processFiles } from "./core/file-processor.js";
import { injectScriptIntoPackage } from "./utils/package-injector.js";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';  
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

// Check if output is being piped
const isPiped = !process.stdout.isTTY;

// Export for programmatic use
export { processFiles, injectScriptIntoPackage };

// More robust CLI detection that handles symlinked packages
const isRunningDirectly = () => {
    try {
        const currentFileUrl = import.meta.url;
        const executedFile = process.argv[1];
        
        if (!executedFile) return false;
        
        // Convert URLs to file paths
        const currentFilePath = fileURLToPath(currentFileUrl);
        const executedFilePath = path.resolve(executedFile);
        
        // Resolve symlinks to get the real physical path
        const realCurrentPath = fs.realpathSync(currentFilePath);
        const realExecutedPath = fs.realpathSync(executedFilePath);
        
        // Compare the real paths
        return realCurrentPath === realExecutedPath;
    } catch (e) {
        return false;
    }
};

// CLI support
if (isRunningDirectly()) {
    // Wrap in an async function since top-level await is available in ES modules
    const run = async () => {
        try {
            const projectRoot = process.cwd();
            
            // Check if this is first run
            const shouldInjectScripts = process.argv.includes('--setup') || !await fs.pathExists(path.join(projectRoot, 'article', 'metadata.js'));
            
            if (shouldInjectScripts) {
                console.log('🔧 Setting up weweb-dynamic-metadata...\n');
                await injectScriptIntoPackage(projectRoot);
            }
            
            // Only show startup message if not piped
            if (!isPiped) {
                console.log('🚀 WeWeb Dynamic Metadata Generator\n');
            }
            
            const result = await processFiles();
            
            if (isPiped) {
                console.log(JSON.stringify(result));
            } else {
                console.log('\n╔' + '═'.repeat(48) + '╗');
                console.log('║' + '🎉 GENERATION COMPLETE'.padEnd(48) + '║');
                console.log('╟' + '─'.repeat(48) + '╢');
                console.log(`║   ⏱️  Duration: ${result.duration}s`.padEnd(50) + '║');
                console.log(`║   📊 Total entries: ${result.totalMetadataEntries}`.padEnd(50) + '║');
                console.log(`║   📁 Output: ${path.basename(result.outputDirectories[0])}`.padEnd(50) + '║');
                console.log('╚' + '═'.repeat(48) + '╝\n');
            }
            process.exit(0);
        } catch (error) {
            if (isPiped) {
                console.log(JSON.stringify({ error: error.message }));
            } else {
                console.error('\n❌ Generation failed:', error.message);
            }
            process.exit(1);
        }
    };
    
    // Run the async function
    run();
}