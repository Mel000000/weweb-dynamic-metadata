import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function readConfig () {
    try{
        const configPath = path.join(__dirname, '../../test/fixtures/weweb.config.js'); // Placeholder for actual config path
        const configUrl = new URL(`file://${configPath.replace(/\\/g, '/')}`);
        const configModule = await import(configUrl.href);
        const config = configModule.default || configModule;
        
        const {supabase, pages} = config;
        const formattedData = {
            supabase,
            pages: pages.map(page => ({
                route: page.route,
                metadataEndpoint: `${supabase.url}/rest/v1/${page.table}?id=eq.{id}&select=${Object.values(page.metadata).join(',')}`,
                headers: {
                    'apikey': supabase.anonKey,
                    'Authorization': `Bearer ${supabase.anonKey}`
                },
                metadataFields: Object.values(page.metadata).flat()
            }))
        }
        return formattedData;
    }
    catch (error) {
        console.error('Error reading config:', error);
        throw error;
    }
}
