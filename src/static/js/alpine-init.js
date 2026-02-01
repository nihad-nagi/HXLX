// Alpine.js initialization for mdBook Components
document.addEventListener('alpine:init', () => {
    console.log('mdBook Components: Alpine.js initialized');
    
    // Auto-initialize components with data-component attributes
    document.querySelectorAll('[data-component]').forEach(el => {
        if (!el.hasAttribute('x-data')) {
            // Add minimal Alpine data if missing
            el.setAttribute('x-data', '{}');
        }
    });
});

// Start Alpine when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('mdBook Components: Page loaded');
    });
} else {
    console.log('mdBook Components: Page already loaded');
}
