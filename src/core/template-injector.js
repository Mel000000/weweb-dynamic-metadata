import fs from 'fs';
import path from 'path';
import { METADATA_INJECTOR_SCRIPT } from '../templates/metadata-injector.js';

export async function injectScriptInTemplate(templatePath) {
    try {
        let template = await fs.promises.readFile(templatePath, 'utf-8');
        
        if (!template.includes('METADATA_INJECTOR')) {
            template = template.replace('</head>', METADATA_INJECTOR_SCRIPT + '\n</head>');
            await fs.promises.writeFile(templatePath, template, 'utf-8');
            console.log(`✅ Injected metadata script into: ${templatePath}`);
        }
    } catch (error) {
        console.error(`❌ Failed to inject script:`, error.message);
    }
}