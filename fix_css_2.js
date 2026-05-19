const fs = require('fs');

const path = 'C:/Users/User/Documents/Roots Astro Tele/frontend/src/index.css';
let content = fs.readFileSync(path, 'utf8');

const marker = '/* Fixes for Client Dashboard Layout */';
if (content.includes(marker)) {
    content = content.split(marker)[0];
}

const newCss = `
/* Fixes for Client Dashboard Layout */
.dash-overview-grid {
    display: grid !important;
    grid-template-columns: 2.2fr 1fr !important;
    gap: 2rem !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

.sessions-list {
    display: flex !important;
    flex-direction: column !important;
    gap: 1rem !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

.sessions-list .booking-item {
    padding: 1.25rem 1.5rem !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 12px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    background: rgba(255,255,255,0.02) !important;
    width: 100% !important;
    box-sizing: border-box !important;
}

/* Base cleanup for excessive heights */
.overview-main, .overview-sidebar {
    height: auto !important;
    min-height: 0 !important;
    box-sizing: border-box !important;
}

.dash-container, .main-content {
    box-sizing: border-box !important;
}
.glass-card { box-sizing: border-box !important; }

@media (max-width: 992px) {
    .dash-overview-grid {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 767px) {
    /* Main Content Top Space Reduction */
    .main-content {
        padding: 1rem 1rem 5rem 1rem !important;
    }

    /* 4 KPIs in 2x2 grid */
    .stat-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 0.75rem !important;
        margin-bottom: 1.25rem !important;
        overflow: visible !important;
    }
    .stat-grid [class*="stat-card"] {
        padding: 0.85rem !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 0.4rem !important;
        flex: auto !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
    }
    /* make icon smaller */
    .stat-grid [class*="stat-card"] > div:first-child {
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
    }
    .stat-grid [class*="stat-card"] > div:first-child svg {
        width: 16px !important;
        height: 16px !important;
    }
    .stat-grid .stat-label { font-size: 0.7rem !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    .stat-grid .stat-value { font-size: 1.15rem !important; margin: 0 !important; }
    .stat-grid .stat-sub { display: none !important; }
    
    /* Order of sections: Upcoming -> QuickBook -> Horoscope */
    .overview-main, .overview-sidebar {
        display: contents !important; 
    }
    .dash-overview-grid {
        display: flex !important;
        flex-direction: column !important;
        gap: 1.25rem !important;
    }
    .upcoming-card { order: 1 !important; margin-bottom: 0 !important; }
    .quickbook-card { order: 2 !important; margin-bottom: 0 !important; }
    .horoscope-card { order: 3 !important; margin-bottom: 0 !important; }
    
    /* Upcoming sessions mobile padding and wrap fix */
    .sessions-list .booking-item {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 1rem !important;
        padding: 1.25rem !important;
        box-sizing: border-box !important;
    }
    .sessions-list .booking-item > div:first-child {
        width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
    }
    .sessions-list .booking-item > div:last-child {
        width: 100% !important;
        justify-content: flex-end !important;
        border-top: 1px solid rgba(255,255,255,0.05) !important;
        padding-top: 0.75rem !important;
        box-sizing: border-box !important;
    }
    
    /* Titles */
    .dash-title {
        font-size: 1.4rem !important;
        margin-bottom: 0.5rem !important;
    }
}
`;

fs.writeFileSync(path, content + newCss, 'utf8');
console.log('CSS Fixed');
