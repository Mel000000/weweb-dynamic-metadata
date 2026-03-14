import { readConfig } from './config-reader.js';  

export async function discoverIds(pageIndex) {
    try{
        const config = await readConfig();
        const reqPath = config.pages[pageIndex].metadataEndpoint.split("?id")[0]; // Fetch all IDs greater than 0
        const res = await fetch(reqPath, {
            headers: config.pages[pageIndex].headers
        });
        const data = await res.json();
        let ids = [];
        for (let i = 0; i < data.length; i++) {
            const id = data[i].id;
            ids.push(id);
        }
        return ids;
    } catch (error) {
        console.error('❌ Error discovering IDs:', error.message);
        throw error;
    }
}
