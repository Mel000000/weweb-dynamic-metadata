// src/templates/metadata-injector.js
export const METADATA_INJECTOR_SCRIPT = `
<!-- METADATA INJECTOR -->
<script src="/article/metadata.js"></script>

<script>
(function() {
    'use strict';
    
    // Prevent duplicate execution
    if (window.__METADATA_INJECTOR_LOADED) {
        console.log('🔄 Metadata injector already loaded, skipping...');
        return;
    }
    window.__METADATA_INJECTOR_LOADED = true;
    
    console.log('🚀 Metadata injector starting...');
    
    // Configuration
    const CONFIG = {
        DEBUG: true,
        META_TIMEOUT: 2000
    };
    
    // State
    let currentMetadata = null;
    let appliedId = null;
    
    // Debug logging
    function debugLog(...args) {
        if (CONFIG.DEBUG) console.log('[Metadata]', ...args);
    }
    
    // Get ID from URL
    function getArticleId() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(p => p.length);
        
        // Case 1: /article/2
        if (parts[0] === 'article' && parts[1] && parts[1] !== '_param') {
            return parts[1];
        }
        
        // Case 2: /article/_param/?id=2
        if (parts[0] === 'article' && parts[1] === '_param') {
            return new URLSearchParams(window.location.search).get('id');
        }
        
        // Case 3: Reference mode (ID stored in global)
        return window.__REFERENCE_ARTICLE_ID;
    }
    
    // Update meta tags
    function setMeta(attr, name, value) {
        if (!value) return;
        let el = document.querySelector(\`meta[\${attr}="\${name}"]\`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', String(value).replace(/[<>]/g, ''));
    }
    
    // Apply metadata
    function applyMetadata() {
        const id = getArticleId();
        if (!id || !window.METADATA) return false;
        
        const meta = window.METADATA[id];
        if (!meta) {
            console.warn('⚠️ No metadata for ID:', id);
            return false;
        }
        
        // Don't reapply if same ID
        if (id === appliedId) return true;
        
        debugLog('Applying metadata for ID:', id);
        
        // Set title - FIXED: Don't remove the title tag, just update it
        if (meta.title) {
            // Find existing title tag or create new one
            let titleTag = document.querySelector('title');
            if (!titleTag) {
                titleTag = document.createElement('title');
                document.head.appendChild(titleTag);
            }
            titleTag.textContent = meta.title;
            // Also set document.title for good measure
            document.title = meta.title;
        }
        
        // Set description
        const desc = meta.content || meta.description;
        if (desc) setMeta('name', 'description', desc);
        
        // Open Graph
        if (meta.title) setMeta('property', 'og:title', meta.title);
        if (desc) setMeta('property', 'og:description', desc);
        setMeta('property', 'og:url', window.location.href.split('?')[0]);
        
        // Image
        const img = meta.image_url || meta.image;
        if (img) {
            setMeta('property', 'og:image', img);
            setMeta('name', 'twitter:image', img);
            setMeta('name', 'twitter:card', 'summary_large_image');
        } else {
            setMeta('name', 'twitter:card', 'summary');
        }
        
        // Twitter
        if (meta.title) setMeta('name', 'twitter:title', meta.title);
        if (desc) setMeta('name', 'twitter:description', desc);
        
        // Canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', window.location.href.split('?')[0]);
        
        // Structured data - FIXED: Don't remove if we don't have data
        if (meta.title || desc || img) {
            // Remove existing JSON-LD
            document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
            
            const ldJson = {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: meta.title || '',
                description: desc || '',
                image: img || '',
                url: window.location.href.split('?')[0]
            };
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(ldJson);
            document.head.appendChild(script);
        }
        
        currentMetadata = meta;
        appliedId = id;
        
        console.log('✅ Metadata applied for', id);
        return true;
    }
    
    // Initialize
    function init() {
        if (applyMetadata()) return;
        
        // Wait for metadata if not loaded
        if (!window.METADATA) {
            const timeout = setTimeout(() => {
                console.log('⏰ Metadata timeout');
                clearInterval(checkInterval);
            }, CONFIG.META_TIMEOUT);
            
            const checkInterval = setInterval(() => {
                if (window.METADATA && applyMetadata()) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                }
            }, 50);
        }
    }
    
    // Start immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Handle SPA navigation
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            appliedId = null;
            init();
        }
    }, 500);
    
})();
</script>
`;