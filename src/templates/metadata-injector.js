// src/templates/metadata-injector.js
export const METADATA_INJECTOR_SCRIPT = `
<!-- METADATA INJECTOR -->
<script src="/article/metadata.js"></script>

<script>
(function() {
    'use strict';
    
    console.log('🚀 Metadata injector starting...');
    
    // Configuration
    const CONFIG = {
        POLLING_INTERVAL: 500,        // ms between protection checks
        URL_CHECK_INTERVAL: 1000,      // ms between URL change checks
        METADATA_TIMEOUT: 3000,        // ms to wait for METADATA to load
        MUTATION_OBSERVER_OPTIONS: {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['content', 'property', 'name']
        },
        DEBUG: true                     // Enable debug logging to see what's happening
    };
    
    // Store our metadata and resources
    let currentMetadata = null;
    let appliedId = null;
    let protectionInterval = null;
    let metadataTimeout = null;
    let urlCheckInterval = null;
    let headObserver = null;
    let urlCheckTimeout = null;
    
    // Debug logging
    function debugLog(...args) {
        if (CONFIG.DEBUG) {
            console.log('[Metadata Debug]', ...args);
        }
    }
    
    // Sanitize content to prevent XSS
    function sanitizeContent(content) {
        if (!content) return content;
        if (typeof content !== 'string') return String(content);
        
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/javascript:/gi, '')
            .replace(/onerror=/gi, '')
            .replace(/onload=/gi, '');
    }
    
    // Validate ID format - FIXED: Much more permissive
    function isValidId(id) {
        if (!id) return false;
        
        // Convert to string for checking
        const idStr = String(id).trim();
        
        // Allow any non-empty value that's not '_param' or other special strings
        // This is much more permissive - just check it's not empty and not '_param'
        if (idStr === '' || idStr === '_param' || idStr === 'null' || idStr === 'undefined') {
            debugLog('Invalid ID value:', idStr);
            return false;
        }
        
        // Allow any string - the metadata object can have any key type
        return true;
    }
    
    function extractIdFromUrl() {
        try {
            const path = window.location.pathname;
            const parts = path.split('/').filter(p => p.length > 0);
            let id = null;
            
            debugLog('URL parts:', parts);
            debugLog('Full URL:', window.location.href);
            
            // Case 1: /article/2/ format
            if (parts.length >= 2 && parts[0] === 'article' && parts[1] && parts[1] !== '_param') {
                id = parts[1];
                debugLog('Found ID in path:', id);
            }
            
            // Case 2: /article/_param/?id=2 format (preview)
            if (!id && parts.length >= 2 && parts[0] === 'article' && parts[1] === '_param') {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('id')) {
                    id = urlParams.get('id');
                    debugLog('Found ID in query param:', id);
                }
            }
            
            // Case 3: ?id=2 anywhere (fallback)
            if (!id) {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('id')) {
                    id = urlParams.get('id');
                    debugLog('Found ID in fallback query param:', id);
                }
            }
            
            // Validate the ID - but don't be too strict
            if (id) {
                if (!isValidId(id)) {
                    console.warn('⚠️ Invalid ID format (but might still work):', id);
                    // Return it anyway - let the metadata lookup decide
                    return id;
                }
                debugLog('Valid ID found:', id);
                return id;
            }
            
            debugLog('No ID found in URL');
            return null;
        } catch (error) {
            console.error('Error extracting ID from URL:', error);
            return null;
        }
    }
    
    function findMetadata(id) {
        try {
            if (!window.METADATA) {
                debugLog('METADATA not loaded yet');
                return null;
            }
            
            debugLog('METADATA available. Keys:', Object.keys(window.METADATA));
            debugLog('Looking for ID:', id, '(type:', typeof id, ')');
            
            // Try exact match (string key)
            if (window.METADATA[id]) {
                debugLog('Found exact string match');
                return window.METADATA[id];
            }
            
            // Try numeric if the id is a number or numeric string
            if (!isNaN(id)) {
                const numericId = Number(id);
                debugLog('Trying numeric ID:', numericId);
                
                // Check if metadata has this numeric key
                if (window.METADATA[numericId]) {
                    debugLog('Found numeric match');
                    return window.METADATA[numericId];
                }
                
                // Check if any key matches when converted to number
                for (const key in window.METADATA) {
                    if (Number(key) === numericId) {
                        debugLog('Found match after numeric conversion');
                        return window.METADATA[key];
                    }
                }
            }
            
            // Try string comparison with all keys
            const stringId = String(id);
            for (const key in window.METADATA) {
                if (String(key) === stringId) {
                    debugLog('Found match after string conversion');
                    return window.METADATA[key];
                }
            }
            
            console.log('❌ No metadata found for ID:', id);
            return null;
        } catch (error) {
            console.error('Error finding metadata:', error);
            return null;
        }
    }
    
    function updateMeta(property, content, attr = 'property') {
        if (!content) return;
        
        try {
            const sanitizedContent = sanitizeContent(content);
            let meta = document.querySelector(\`meta[\${attr}="\${property}"]\`);
            
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute(attr, property);
                document.head.appendChild(meta);
            }
            
            meta.setAttribute('content', sanitizedContent);
            debugLog(\`Updated meta \${property}: \${sanitizedContent.substring(0, 30)}...\`);
        } catch (error) {
            console.error(\`Error updating meta \${property}:\`, error);
        }
    }
    
    function updateLink(rel, href) {
        if (!href) return;
        
        try {
            let link = document.querySelector(\`link[rel="\${rel}"]\`);
            
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', rel);
                document.head.appendChild(link);
            }
            
            link.setAttribute('href', href);
            debugLog(\`Updated link \${rel}: \${href}\`);
        } catch (error) {
            console.error(\`Error updating link \${rel}:\`, error);
        }
    }
    
    function updateStructuredData(metadata) {
        try {
            // Remove existing JSON-LD
            const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
            existingScripts.forEach(script => script.remove());
            
            // Only create if we have enough data
            if (!metadata.title && !metadata.content) {
                debugLog('Not enough data for structured data');
                return;
            }
            
            // Create new JSON-LD
            const structuredData = {
                '@context': 'https://schema.org',
                '@type': 'Article',
                'headline': metadata.title || '',
                'description': metadata.content || metadata.description || '',
                'image': metadata.image_url || metadata.image || '',
                'url': window.location.href.split('?')[0]
            };
            
            // Add optional fields if they exist
            if (metadata.published_date) {
                structuredData.datePublished = metadata.published_date;
            }
            
            if (metadata.modified_date || metadata.published_date) {
                structuredData.dateModified = metadata.modified_date || metadata.published_date;
            }
            
            if (metadata.author) {
                structuredData.author = {
                    '@type': 'Person',
                    'name': metadata.author
                };
            }
            
            if (metadata.tags && Array.isArray(metadata.tags)) {
                structuredData.keywords = metadata.tags.join(', ');
            }
            
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(structuredData);
            document.head.appendChild(script);
            
            debugLog('Structured data updated');
        } catch (error) {
            console.error('Error updating structured data:', error);
        }
    }
    
    function updateAllMetaTags(metadata) {
        try {
            debugLog('Updating all meta tags with:', metadata);
            
            // Basic title
            if (metadata.title) {
                document.title = sanitizeContent(metadata.title);
                
                // Ensure title tag exists
                let titleTag = document.querySelector('title');
                if (!titleTag) {
                    titleTag = document.createElement('title');
                    document.head.appendChild(titleTag);
                }
                titleTag.textContent = sanitizeContent(metadata.title);
            }
            
            // Basic meta tags
            const description = metadata.content || metadata.description;
            if (description) {
                updateMeta('description', description, 'name');
            }
            
            if (metadata.tags && Array.isArray(metadata.tags)) {
                updateMeta('keywords', metadata.tags.join(', '), 'name');
            }
            
            // Open Graph tags
            if (metadata.title) {
                updateMeta('og:title', metadata.title);
            }
            
            if (description) {
                updateMeta('og:description', description);
            }
            
            updateMeta('og:url', window.location.href.split('?')[0]);
            updateMeta('og:type', 'article');
            
            // Article specific OG tags
            if (metadata.published_date) {
                updateMeta('article:published_time', metadata.published_date);
            }
            
            if (metadata.modified_date || metadata.published_date) {
                updateMeta('article:modified_time', metadata.modified_date || metadata.published_date);
            }
            
            if (metadata.author) {
                updateMeta('article:author', metadata.author);
            }
            
            if (metadata.category) {
                updateMeta('article:section', metadata.category);
            }
            
            if (metadata.tags && Array.isArray(metadata.tags)) {
                updateMeta('article:tag', metadata.tags.join(', '));
            }
            
            // Twitter Card tags
            const imageUrl = metadata.image_url || metadata.image;
            updateMeta('twitter:card', imageUrl ? 'summary_large_image' : 'summary', 'name');
            
            if (metadata.title) {
                updateMeta('twitter:title', metadata.title, 'name');
            }
            
            if (description) {
                updateMeta('twitter:description', description, 'name');
            }
            
            // Images
            if (imageUrl) {
                updateMeta('og:image', imageUrl);
                updateMeta('og:image:secure_url', imageUrl);
                updateMeta('og:image:width', metadata.image_width || '1200');
                updateMeta('og:image:height', metadata.image_height || '630');
                
                if (metadata.title) {
                    updateMeta('og:image:alt', metadata.title);
                }
                
                updateMeta('twitter:image', imageUrl, 'name');
                
                if (metadata.title) {
                    updateMeta('twitter:image:alt', metadata.title, 'name');
                }
            }
            
            // Canonical URL
            updateLink('canonical', window.location.href.split('?')[0]);
            
            // Structured data (JSON-LD)
            updateStructuredData(metadata);
            
            console.log('✅ All meta tags updated successfully');
        } catch (error) {
            console.error('Error updating meta tags:', error);
        }
    }
    
    function protectMetaTags() {
        if (!currentMetadata) return;
        
        try {
            // Check title
            if (currentMetadata.title) {
                const expectedTitle = sanitizeContent(currentMetadata.title);
                if (document.title !== expectedTitle) {
                    debugLog('Title was incorrect, restoring...');
                    document.title = expectedTitle;
                    
                    let titleTag = document.querySelector('title');
                    if (titleTag) {
                        titleTag.textContent = expectedTitle;
                    }
                }
            }
            
            // Check all important meta tags (simplified to avoid too many DOM operations)
            const description = currentMetadata.content || currentMetadata.description;
            const imageUrl = currentMetadata.image_url || currentMetadata.image;
            
            const checks = [
                { attr: 'name', value: 'description', content: description },
                { attr: 'property', value: 'og:title', content: currentMetadata.title },
                { attr: 'name', value: 'twitter:title', content: currentMetadata.title },
                { attr: 'property', value: 'og:description', content: description },
                { attr: 'name', value: 'twitter:description', content: description }
            ];
            
            // Add image checks only if image exists
            if (imageUrl) {
                checks.push(
                    { attr: 'property', value: 'og:image', content: imageUrl },
                    { attr: 'name', value: 'twitter:image', content: imageUrl }
                );
            }
            
            checks.forEach(check => {
                if (!check.content) return;
                
                const selector = check.attr === 'property' 
                    ? \`meta[property="\${check.value}"]\`
                    : \`meta[name="\${check.value}"]\`;
                    
                const meta = document.querySelector(selector);
                if (!meta || meta.getAttribute('content') !== sanitizeContent(check.content)) {
                    debugLog(\`Restoring \${check.value}\`);
                    updateMeta(check.value, check.content, check.attr);
                }
            });
            
            // Check canonical link
            const canonical = document.querySelector('link[rel="canonical"]');
            const expectedCanonical = window.location.href.split('?')[0];
            if (!canonical || canonical.getAttribute('href') !== expectedCanonical) {
                debugLog('Restoring canonical link');
                updateLink('canonical', expectedCanonical);
            }
        } catch (error) {
            console.error('Error protecting meta tags:', error);
        }
    }
    
    function applyMetadata(force = false) {
        try {
            const id = extractIdFromUrl();
            debugLog('Extracted ID:', id, 'force:', force);
            
            if (!id) {
                debugLog('No ID found in URL');
                return false;
            }
            
            if (!force && id === appliedId && currentMetadata) {
                // Already applied this ID, just protect
                debugLog('Already applied ID', id, ', just protecting');
                protectMetaTags();
                return true;
            }
            
            const metadata = findMetadata(id);
            if (!metadata) {
                console.log('❌ No metadata found for ID:', id);
                return false;
            }
            
            console.log('📦 Applying metadata for ID:', id, metadata);
            currentMetadata = metadata;
            appliedId = id;
            
            // Update all meta tags
            updateAllMetaTags(metadata);
            
            return true;
        } catch (error) {
            console.error('Error applying metadata:', error);
            return false;
        }
    }
    
    function cleanup() {
        debugLog('Cleaning up resources');
        
        if (protectionInterval) {
            clearInterval(protectionInterval);
            protectionInterval = null;
        }
        
        if (urlCheckInterval) {
            clearInterval(urlCheckInterval);
            urlCheckInterval = null;
        }
        
        if (metadataTimeout) {
            clearTimeout(metadataTimeout);
            metadataTimeout = null;
        }
        
        if (urlCheckTimeout) {
            clearTimeout(urlCheckTimeout);
            urlCheckTimeout = null;
        }
        
        if (headObserver) {
            headObserver.disconnect();
            headObserver = null;
        }
    }
    
    function startHeadProtection() {
        try {
            // Protect immediately
            protectMetaTags();
            
            // Watch for any changes to the head
            headObserver = new MutationObserver((mutations) => {
                let needsProtection = false;
                
                for (const mutation of mutations) {
                    // If title was changed
                    if (mutation.target.nodeName === 'TITLE') {
                        debugLog('Title was modified');
                        needsProtection = true;
                        break;
                    }
                    
                    // If meta tags were added/removed
                    if (mutation.type === 'childList') {
                        for (const node of mutation.removedNodes) {
                            if (node.nodeName === 'META' || node.nodeName === 'TITLE' || node.nodeName === 'LINK') {
                                debugLog('Meta tag, title, or link removed');
                                needsProtection = true;
                                break;
                            }
                        }
                        
                        if (needsProtection) break;
                        
                        for (const node of mutation.addedNodes) {
                            if (node.nodeName === 'META' && node.getAttribute('property')?.includes('og:')) {
                                // New og tag added, check if it has our content
                                const property = node.getAttribute('property');
                                let expectedContent = null;
                                
                                if (property === 'og:title') expectedContent = currentMetadata?.title;
                                else if (property === 'og:description') expectedContent = currentMetadata?.content || currentMetadata?.description;
                                else if (property === 'og:image') expectedContent = currentMetadata?.image_url || currentMetadata?.image;
                                
                                if (expectedContent && node.getAttribute('content') !== sanitizeContent(expectedContent)) {
                                    debugLog('New og tag added with wrong content');
                                    needsProtection = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (needsProtection) {
                    debugLog('Head changed, reapplying metadata...');
                    protectMetaTags();
                }
            });
            
            // Observe head and all its children
            headObserver.observe(document.head, CONFIG.MUTATION_OBSERVER_OPTIONS);
            
            // Periodic protection as backup
            protectionInterval = setInterval(() => {
                if (currentMetadata) {
                    protectMetaTags();
                }
            }, CONFIG.POLLING_INTERVAL);
            
            console.log('🛡️ Head protection active');
        } catch (error) {
            console.error('Error starting head protection:', error);
        }
    }
    
    function init() {
        debugLog('Initializing metadata injector');
        
        // Clean up any existing resources
        cleanup();
        
        // Try to apply metadata
        if (applyMetadata()) {
            startHeadProtection();
        } else {
            debugLog('Initial apply failed, waiting for METADATA...');
            
            // If metadata not loaded yet, wait for it
            let checkCount = 0;
            const checkMetadataInterval = setInterval(() => {
                checkCount++;
                debugLog('Checking for METADATA... attempt', checkCount);
                
                if (window.METADATA) {
                    debugLog('METADATA found, applying...');
                    if (applyMetadata()) {
                        startHeadProtection();
                        clearInterval(checkMetadataInterval);
                        if (metadataTimeout) {
                            clearTimeout(metadataTimeout);
                            metadataTimeout = null;
                        }
                    }
                }
            }, 100);
            
            // Timeout for metadata loading
            metadataTimeout = setTimeout(() => {
                clearInterval(checkMetadataInterval);
                if (!currentMetadata) {
                    console.log('⏰ Metadata timeout, trying one more time');
                    applyMetadata(true);
                }
            }, CONFIG.METADATA_TIMEOUT);
        }
    }
    
    // Handle SPA navigation
    function setupUrlChangeDetection() {
        let lastUrl = location.href;
        
        urlCheckInterval = setInterval(() => {
            if (location.href !== lastUrl) {
                // Debounce rapid URL changes
                clearTimeout(urlCheckTimeout);
                urlCheckTimeout = setTimeout(() => {
                    lastUrl = location.href;
                    console.log('🔄 URL changed, reapplying metadata');
                    appliedId = null; // Reset so we reapply
                    init();
                }, 100);
            }
        }, CONFIG.URL_CHECK_INTERVAL);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            setupUrlChangeDetection();
        });
    } else {
        init();
        setupUrlChangeDetection();
    }
    
    // Handle page unload to clean up
    window.addEventListener('beforeunload', cleanup);
    
    // Expose API for manual control (useful for debugging)
    window.MetadataInjector = {
        refresh: () => {
            appliedId = null;
            init();
        },
        getCurrentMetadata: () => currentMetadata,
        cleanup: cleanup,
        setDebug: (enabled) => {
            CONFIG.DEBUG = enabled;
            console.log('Debug mode:', enabled ? 'enabled' : 'disabled');
        },
        forceApply: (id) => {
            if (id) {
                appliedId = null;
                const metadata = findMetadata(id);
                if (metadata) {
                    currentMetadata = metadata;
                    appliedId = id;
                    updateAllMetaTags(metadata);
                    return true;
                }
            }
            return false;
        }
    };
    
})();
</script>
`;