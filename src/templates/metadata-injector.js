// src/templates/metadata-injector.js
export async function metadata_injector_script(page) {
    const baseRoute = page.route.split('/')[1];
    return `
<!-- METADATA INJECTOR -->
<script src="/${baseRoute}/metadata.js"></script>

<script>
(function() {
    'use strict';
    
    // Prevent duplicate execution
    if (window.__METADATA_INJECTOR_LOADED) return;
    window.__METADATA_INJECTOR_LOADED = true;
    
    function getId() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(p => p.length);
        
        // Case 1: /content/2
        if (parts[0] === ${JSON.stringify(baseRoute)} && parts[1] && parts[1] !== '_param') {
            return parts[1];
        }
        
        // Case 2: /content/_param/?id=2
        if (parts[0] === ${JSON.stringify(baseRoute)} && parts[1] === '_param') {
            return new URLSearchParams(window.location.search).get('id');
        }
        
        // Case 3: Reference mode (ID stored in global)
        return window.__REFERENCE_CONTENT_ID;
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
    
    function applyMetadata() {
        const id = getId();
        if (!id || !window.METADATA) return false;
        
        const meta = window.METADATA[id];
        if (!meta) return false;
        
        // Set title
        if (meta.title) {
            let titleTag = document.querySelector('title');
            if (!titleTag) {
                titleTag = document.createElement('title');
                document.head.appendChild(titleTag);
            }
            titleTag.textContent = meta.title;
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
        
        // Structured data
        if (meta.title || desc || img) {
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
        
        return true;
    }
    
    // Initialize
    function init() {
        if (applyMetadata()) return;
        
        // Wait for metadata if not loaded
        if (!window.METADATA) {
            const checkInterval = setInterval(() => {
                if (window.METADATA && applyMetadata()) {
                    clearInterval(checkInterval);
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
    
})();
</script>
`;
}