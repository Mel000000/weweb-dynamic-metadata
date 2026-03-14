// src/utils/paths.js
import path from 'path';
import fs from 'fs-extra';

export function getConfigPath() {
    return path.join(process.cwd(), 'weweb.config.js');
}

export function getOutputDir() {
    const projectRoot = process.cwd();
    
    // First, check if 'dist' exists (production build)
    const distPath = path.join(projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
        return distPath;
    }
    
    // Check common WeWeb export locations
    const possiblePaths = [
        path.join(projectRoot, 'out'),           // WeWeb default export
        path.join(projectRoot, 'build'),          // Common build folder
        path.join(projectRoot, 'www'),            // Another common one
        path.join(projectRoot, 'public'),         // Static folder
    ];
    
    for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
            return testPath;
        }
    }
    
    // If no existing build found, ask user to specify
    throw new Error(
        'Could not find your WeWeb build folder.\n' +
        'Please ensure you have run "weweb export" first,\n' +
        'or specify the path in weweb.config.js'
    );
}

export function getRoutePaths(baseDir, route) {
    const routeName = route.split('/')[1];
    return {
        paramDir: path.join(baseDir, routeName, '_param'),
        articleRoot: path.join(baseDir, routeName),
        templatePath: path.join(baseDir, routeName, '_param', 'index.html'),
        metadataPath: path.join(baseDir, routeName, 'metadata.js')
    };
}