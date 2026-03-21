// src/utils/template-injector.js
import fs from 'fs-extra';
import path from 'path';
import { metadata_injector_script } from '../templates/metadata-injector.js';

export async function injectScriptInTemplate(templatePath, page) {
    try {
        // Check if file exists
        if (!await fs.pathExists(templatePath)) {
            console.log(`⚠️ Template not found: ${templatePath}`);
            return false;
        }
        
        // Read template
        let template = await fs.readFile(templatePath, 'utf-8');
        
        // Check if script is already injected using multiple markers
        const hasInjector = 
            template.includes('__METADATA_INJECTOR_LOADED') || 
            template.includes('METADATA INJECTOR') ||
            (template.includes('/article/metadata.js') && template.includes('applyMetadata'));
        
        if (hasInjector) {
            console.log(`⏭️ Metadata injector already present in: ${templatePath}`);
            
            // Optional: Remove duplicates if they exist
            const cleanedTemplate = removeDuplicateInjectors(template);
            if (cleanedTemplate !== template) {
                await fs.writeFile(templatePath, cleanedTemplate, 'utf-8');
                console.log(`🧹 Cleaned up duplicate injectors in: ${templatePath}`);
            }
            
            return true;
        }
        
        // Insert script before </head>
        template = template.replace('</head>', metadata_injector_script(page) + '\n</head>');
        
        // Write back
        await fs.writeFile(templatePath, template, 'utf-8');
        console.log(`✅ Injected metadata script into: ${templatePath}`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to inject script:`, error.message);
        return false;
    }
}

// Helper function to remove duplicate injectors
function removeDuplicateInjectors(html) {
    // Count occurrences of the injector marker
    const markerCount = (html.match(/__METADATA_INJECTOR_LOADED/g) || []).length;
    
    if (markerCount <= 1) return html;
    
    console.log(`🧹 Found ${markerCount} duplicate injectors, cleaning up...`);
    
    // Split by the injector and keep only the first one
    const parts = html.split('<!-- METADATA INJECTOR -->');
    
    if (parts.length > 2) {
        // Keep first injector, remove others
        return parts[0] + '<!-- METADATA INJECTOR -->' + parts[1].split('</script>')[0] + '</script>\n' + parts.slice(2).join('').replace(/<script[\s\S]*?<\/script>/g, '');
    }
    
    return html;
}

// Optional: Function to check if injector exists without modifying
export async function hasMetadataInjector(templatePath) {
    try {
        if (!await fs.pathExists(templatePath)) return false;
        
        const template = await fs.readFile(templatePath, 'utf-8');
        return template.includes('__METADATA_INJECTOR_LOADED') || 
               template.includes('METADATA INJECTOR');
    } catch {
        return false;
    }
}