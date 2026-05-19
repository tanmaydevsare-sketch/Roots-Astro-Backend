import os

path = r'c:\Users\User\Documents\Roots Astro Tele\frontend\src\index.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

marker = '/* Fixes for Client Dashboard Layout */'
if marker in content:
    content = content.split(marker)[0]

new_css = """
/* Fixes for Client Dashboard Layout */
.dash-overview-grid {
    display: grid !important;
    grid-template-columns: 2fr 1fr !important;
    gap: 2rem !important;
    width: 100% !important;
}

.sessions-list {
    display: flex !important;
    flex-direction: column !important;
    gap: 1rem !important;
}

.sessions-list .booking-item {
    padding: 1.25rem 1.5rem !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 12px !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    background: rgba(255,255,255,0.02) !important;
}

/* Ensure no massive heights or overlaps */
.overview-main, .overview-sidebar {
    height: auto !important;
    min-height: 0 !important;
}

@media (max-width: 992px) {
    .dash-overview-grid {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 767px) {
    /* 4 KPIs in 2x2 grid */
    .stat-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 0.75rem !important;
        margin-bottom: 1rem !important;
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
    .stat-grid .stat-sub { display: none !important; } /* hide subtitle to save space */
    
    /* Upcoming sessions mobile padding and wrap */
    .sessions-list .booking-item {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 1rem !important;
        padding: 1.25rem !important;
    }
    .sessions-list .booking-item > div:first-child {
        width: 100% !important;
    }
    .sessions-list .booking-item > div:last-child {
        width: 100% !important;
        justify-content: flex-end !important;
        border-top: 1px solid rgba(255,255,255,0.05) !important;
        padding-top: 0.75rem !important;
    }
    
    /* Fix weird dark space explicitly */
    .overview-sidebar { margin-top: 1.5rem !important; }
    .horoscope-card { margin-bottom: 0 !important; height: auto !important; }
}
"""

with open(path, 'w', encoding='utf-8') as f:
    f.write(content + new_css)

print("CSS Fixed")
