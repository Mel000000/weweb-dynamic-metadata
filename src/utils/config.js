import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

const CONFIG_SCHEMA = {
    supabase: { required: true, type: 'object' },
    pages: { required: true, type: 'array', min: 1 }
};

export async function loadConfig() {
    const configPath = path.join(process.cwd(), 'weweb.config.js');
    
    if (!await fs.pathExists(configPath)) {
        throw new Error(`Config not found: ${configPath}`);
    }
    
    try {
        const config = (await import(`file://${configPath}`)).default;
        return formatConfig(config);
    } catch (error) {
        throw new Error(`Invalid config: ${error.message}`);
    }
}

export function validateConfig(config) {
    const errors = [];
    
    for (const [key, rules] of Object.entries(CONFIG_SCHEMA)) {
        if (rules.required && !config[key]) {
            errors.push(`Missing required field: ${key}`);
        }
    }
    
    if (!Array.isArray(config.pages) || config.pages.length === 0) {
        errors.push('At least one page required');
    }
    
    config.pages.forEach((page, i) => {
        if (!page.route) errors.push(`Page ${i}: missing route`);
        if (!page.table) errors.push(`Page ${i}: missing table`);
        if (!page.metadata) errors.push(`Page ${i}: missing metadata fields`);
    });
    
    if (errors.length > 0) {
        throw new Error(`Config validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
}

function formatConfig(config) {
    return {
        supabase: config.supabase,
        pages: config.pages.map(page => ({
            route: page.route,
            table: page.table,
            metadataEndpoint: `${config.supabase.url}/rest/v1/${page.table}?id=eq.{id}&select=${Object.values(page.metadata).join(',')}`,
            headers: {
                'apikey': config.supabase.anonKey,
                'Authorization': `Bearer ${config.supabase.anonKey}`
            },
            metadataFields: Object.values(page.metadata)
        }))
    };
}