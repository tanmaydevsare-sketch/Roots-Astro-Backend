const fs = require('fs');
const path = 'C:/Users/User/Documents/Roots Astro Tele/frontend/src/index.css';
let content = fs.readFileSync(path, 'utf8');

const newCss = `
/* Strict Mobile Padding Bounds & Truncation fixes */
@media (max-width: 767px) {
    .quickbook-card, .horoscope-card, .upcoming-card, .dash-overview-grid > .glass-card {
        padding: 1.25rem !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
    }
    
    .astro-mini-card {
        padding: 0.75rem !important;
        width: 100% !important;
        box-sizing: border-box !important;
        min-width: 0 !important;
    }

    .astro-mini-card > div:nth-child(2) {
        min-width: 0 !important;
        flex: 1 1 0% !important;
    }

    .astro-mini-card strong, 
    .astro-mini-card p {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        width: 100% !important;
        display: block !important;
    }
    
    .dash-overview-grid {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
    }
    
    .main-content {
        overflow-x: hidden !important;
        width: 100vw !important;
        max-width: 100% !important;
    }
}
`;

fs.writeFileSync(path, content + newCss, 'utf8');
console.log('padding fixed');
