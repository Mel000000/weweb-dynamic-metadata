import { readConfig } from './config-reader.js';  

export async function fetchMetadata(pageId, id) {
  try {
    const config = await readConfig();
    const reqPath = config.pages[pageId].metadataEndpoint.replace('{id}', id || "1"); // Replace {id} with actual page ID

    const metadata = await fetch(reqPath, {
      headers: config.pages[pageId].headers
    });
    
    return metadata.json(); 
  } catch (error) {
    console.error('❌ Error fetching metadata:', error.message);
    throw error;
  }
}


