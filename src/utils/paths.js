// src/utils/paths.js
import path from 'path';

export function getProjectRoot() {
    // When running as a package, the user's project root is process.cwd()
    return process.cwd();
}

export function getConfigPath() {
    return path.join(getProjectRoot(), 'weweb.config.js');
}

export function getOutputDir() {
    const projectRoot = getProjectRoot();
    return process.env.NODE_ENV === 'production'
        ? path.join(projectRoot, 'dist')
        : path.join(projectRoot, 'test', 'fixtures', 'postBuild');
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