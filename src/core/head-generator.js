import { readConfig } from './config-reader.js';

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export async function generateHeadHtml(pageIndex,metadata) {
    try{
        const config = await readConfig();
        const page = config.pages[pageIndex];
        const metadataFields = page.metadataFields || [];
        
        let headHtml = '';
        
        // Generate meta tags based on the fields
        metadataFields.forEach(field => {
            const value = metadata[field];
            if (!value) return; // Skip if no value
            
            switch(field) {
                case 'title':
                    // Title needs special handling
                    headHtml += `<title>${escapeHtml(value)}</title>\n`;
                    headHtml += `<meta property="og:title" content="${escapeHtml(value)}">\n`;
                    headHtml += `<meta name="twitter:title" content="${escapeHtml(value)}">\n`;
                    break;
                    
                case 'description':
                    headHtml += `<meta name="description" content="${escapeHtml(value)}">\n`;
                    headHtml += `<meta property="og:description" content="${escapeHtml(value)}">\n`;
                    headHtml += `<meta name="twitter:description" content="${escapeHtml(value)}">\n`;
                    break;
                    
                case 'image':
                    headHtml += `<meta property="og:image" content="${escapeHtml(value)}">\n`;
                    headHtml += `<meta name="twitter:image" content="${escapeHtml(value)}">\n`;
                    headHtml += `<meta name="twitter:card" content="summary_large_image">\n`;
                    break;
                    
                case 'keywords':
                    headHtml += `<meta name="keywords" content="${escapeHtml(value)}">\n`;
                    break;
                    
                case 'author':
                    headHtml += `<meta name="author" content="${escapeHtml(value)}">\n`;
                    break;
                    
                case 'publishedDate':
                case 'published':
                    headHtml += `<meta property="article:published_time" content="${escapeHtml(value)}">\n`;
                    break;
                    
                default:
                    // For any other fields, create a generic meta tag
                    headHtml += `<meta name="${escapeHtml(field)}" content="${escapeHtml(value)}">\n`;
            }
        });
        
        // Add Open Graph type if not present
        if (!headHtml.includes('og:type')) {
            headHtml += `<meta property="og:type" content="article">\n`;
        }
             
        return headHtml;

    }
    catch (error) {
        console.error('❌ Error generating head HTML:', error.message);
        throw error;
    }
}
