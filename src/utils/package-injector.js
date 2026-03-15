import fs from 'fs-extra';
import path from 'path';

export async function injectScriptIntoPackage(projectRoot) {
    const packagePath = path.join(projectRoot, 'package.json');
    
    // Check if package.json exists
    if (!await fs.pathExists(packagePath)) {
        console.log('⚠️ No package.json found, skipping script injection');
        return false;
    }
    
    // Read package.json
    const packageJson = await fs.readJson(packagePath);
    
    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }
    
    // Check if scripts already exist
    const hasGenerateScript = packageJson.scripts.generate?.includes('weweb-dynamic-metadata');
    const hasGeneratePrettyScript = packageJson.scripts['generate:pretty']?.includes('weweb-dynamic-metadata');
    
    // Only add if they don't exist
    let changesMade = false;
    
    if (!hasGenerateScript) {
        packageJson.scripts.generate = "node -e \"import('weweb-dynamic-metadata').then(m => m.processFiles()).then(r => console.log(JSON.stringify(r, null, 2)))\"";
        changesMade = true;
        console.log('✅ Added "generate" script to package.json');
    }
    
    if (!hasGeneratePrettyScript) {
        packageJson.scripts['generate:pretty'] = "node -e \"import('weweb-dynamic-metadata').then(m => m.processFiles()).then(r => { console.log('✅ Success!'); console.log(`📊 Total: ${r.totalMetadataEntries}`); console.log(`⏱️  Duration: ${r.duration}s`); })\"";
        changesMade = true;
        console.log('✅ Added "generate:pretty" script to package.json');
    }
    
    // Write back if changes were made
    if (changesMade) {
        await fs.writeJson(packagePath, packageJson, { spaces: 2 });
        console.log('📝 package.json updated successfully');
    } else {
        console.log('⏭️ Scripts already exist in package.json');
    }
    
    return changesMade;
}