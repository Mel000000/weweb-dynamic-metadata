import { fileURLToPath } from 'url';
import { getConfigPath, getOutputDir, getRoutePaths } from '../utils/paths.js';
import path from 'path';
import fs from 'fs-extra';
import { injectScriptInTemplate } from "../utils/template-injector.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========== CONFIG LOADING ==========
async function readConfig() {
    try {
        const configPath = getConfigPath();
        const configUrl = new URL(`file://${configPath.replace(/\\/g, '/')}`);
        const configModule = await import(configUrl.href);
        const config = configModule.default || configModule;
        
        const { supabase, pages, outputDir } = config;
        
        return {
            supabase,
            outputDir, 
            pages: pages.map(page => ({
                route: page.route,
                table: page.table,
                metadataEndpoint: `${supabase.url}/rest/v1/${page.table}?id=eq.{id}&select=${Object.values(page.metadata).join(',')}`,
                headers: {
                    'apikey': supabase.anonKey,
                    'Authorization': `Bearer ${supabase.anonKey}`
                },
                metadataFields: Object.values(page.metadata)
            }))
        };
    } catch (error) {
        throw new Error(`Config error: ${error.message}`);
    }
}

// ========== ID DISCOVERY ==========
async function discoverIds(page) {
    try {
        const url = page.metadataEndpoint.split("?id")[0];
        const res = await fetch(url, { headers: page.headers });
        const data = await res.json();
        return data.map(item => item.id).filter(Boolean);
    } catch (error) {
        throw new Error(`ID discovery failed: ${error.message}`);
    }
}

// ========== METADATA FETCHING ==========
async function fetchMetadata(page, id) {
    try {
        const url = page.metadataEndpoint.replace('{id}', id || "1");
        const res = await fetch(url, { headers: page.headers });
        const data = await res.json();
        return Array.isArray(data) ? data[0] : data;
    } catch (error) {
        throw new Error(`Failed to fetch ID ${id}: ${error.message}`);
    }
}

// ========== HELPER FUNCTIONS ==========
function generateMetadataJs(metadataObject) {
    return `// Metadata generated on ${new Date().toISOString()}
window.METADATA = ${JSON.stringify(metadataObject, null, 2)};`;
}


async function ensureTemplateExists(templatePath) {
    if (await fs.pathExists(templatePath)) return;
    
    const minimalTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="/">
    <title></title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/assets/main.js"></script>
</body>
</html>`;
    await fs.writeFile(templatePath, minimalTemplate, 'utf-8');
}

// ========== reference HTML ==========
function generateReferenceHtml(id, title, relativeTemplatePath) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title || 'Loading...'}</title>
    <!-- Load the template dynamically -->
    <script>
        (function() {
            // Store the ID in a global variable for the template to use
            window.__REFERENCE_CONTENT_ID = ${JSON.stringify(String(id))};
            
            // Fetch the template and replace the current document
            fetch('${relativeTemplatePath}')
                .then(response => response.text())
                .then(html => {
                    // Write the template HTML
                    document.open();
                    document.write(html);
                    document.close();
                })
                .catch(error => {
                    console.error('Failed to load template:', error);
                    document.body.innerHTML = '<h1>Error loading article</h1><p>Please refresh the page</p>';
                });
        })();
    </script>
    
    <!-- Fallback for noscript -->
    <noscript>
        <meta http-equiv="refresh" content="0; url=${relativeTemplatePath}?id=${id}">
    </noscript>
</head>
<body>
    <p>Loading article ${id}... <a href="${relativeTemplatePath}?id=${id}">Click here if not redirected</a></p>
</body>
</html>`;
}

// ========== MAIN PROCESSOR ==========
export async function processFiles() {
    const startTime = Date.now();
    
    try {
        const config = await readConfig();
        const summary = {
            timestamp: new Date().toISOString(),
            pages: [],
            totalMetadataEntries: 0,
            outputDirectories: [],
            duration: 0
        };
        
        for (let i = 0; i < config.pages.length; i++) {
            const page = config.pages[i];
            
            // Discover IDs
            const ids = await discoverIds(page);
            
            // Setup paths
            const routeName = page.route.split('/')[1];
            const baseDir = config.outputDir || getOutputDir();
            
            const paramDir = path.join(baseDir, routeName, '_param');
            const contentRootDir = path.join(baseDir, routeName);
            const templatePath = path.join(paramDir, 'index.html');
            
            await fs.ensureDir(paramDir);
            await fs.ensureDir(contentRootDir);
            
            // Ensure template exists and inject script
            await ensureTemplateExists(templatePath);
            await injectScriptInTemplate(templatePath, page);
            
            // Fetch all metadata
            const metadataMap = new Map();
            let successCount = 0;
            let failCount = 0;
            
            for (const id of ids) {
                try {
                    const metadata = await fetchMetadata(page, id);
                    metadataMap.set(String(id), metadata);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }
            
            // Write metadata.js
            const metadataObj = Object.fromEntries(metadataMap);
            const metadataJsPath = path.join(contentRootDir, 'metadata.js');
            await fs.writeFile(metadataJsPath, generateMetadataJs(metadataObj));
            
            // Copy to _param for compatibility
            await fs.copyFile(metadataJsPath, path.join(paramDir, 'metadata.js'));
            
            
            // Create reference files using the ORIGINAL working logic
            const relativeTemplatePath = '../_param/index.html';
            let referencesCreated = 0;
            
            for (const [id, metadata] of metadataMap.entries()) {
                try {
                    const contentDir = path.join(baseDir, routeName, id);
                    await fs.ensureDir(contentDir);
                    
                    await fs.writeFile(
                        path.join(contentDir, 'index.html'),
                        generateReferenceHtml(id, metadata.title, relativeTemplatePath)
                    );
                    
                    // Create a small metadata.js reference
                    const contentMetadataJsPath = path.join(contentRootDir, 'metadata.js');
                    const metadataReference = `// Reference to central metadata file
// This file points to the main metadata.js
// The actual metadata is loaded from /article/metadata.js`;
                    
                    await fs.writeFile(contentMetadataJsPath, metadataReference, 'utf-8');
                    
                    referencesCreated++;
                } catch (error) {
                    // Silently continue
                }
            }
            
            summary.pages.push({
                route: page.route,
                total: ids.length,
                succeeded: successCount,
                failed: failCount,
                metadataEntries: metadataMap.size,
                referencesCreated
            });
            
            summary.totalMetadataEntries += metadataMap.size;
            summary.outputDirectories.push(contentRootDirRootDir);
        }
        
        summary.duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        return summary;
        
    } catch (error) {
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    processFiles()
        .then(summary => {
            console.log(JSON.stringify(summary, null, 2));
            process.exit(0);
        })
        .catch(error => {
            console.error(JSON.stringify({ error: error.message }));
            process.exit(1);
        });
}