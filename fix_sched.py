import os

path = r'c:\Users\User\Documents\Roots Astro Tele\frontend\src\pages\AstrologerDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the inline style block
old_style_start = '<style>{`\n                                    /* ── Base (mobile) card layout ── */'
old_style_end = '                                    @media (min-width: 992px) {'

new_style = '''<style>{`
                                    /* ── Base (mobile) card layout ── */
                                    .avail-card {
                                        background: rgba(255,255,255,0.025);
                                        border: 1px solid rgba(255,255,255,0.07);
                                        border-radius: 16px;
                                        padding: 1.25rem;
                                        transition: border-color 0.2s, background 0.2s;
                                        display: flex;
                                        flex-direction: column;
                                        gap: 1.25rem;
                                    }
                                    .avail-card.active {
                                        border-color: rgba(212,175,55,0.18);
                                        background: rgba(212,175,55,0.03);
                                    }
                                    .avail-card-header {
                                        display: flex;
                                        align-items: center;
                                        justify-content: space-between;
                                    }
                                    .avail-day-name {
                                        font-size: 1.05rem; font-weight: 700;
                                        text-transform: uppercase; letter-spacing: 1px;
                                        color: var(--text-main);
                                    }
                                    .avail-day-name.off { color: var(--text-muted); font-weight: 400; opacity: 0.6; }
                                    .avail-card-body { display: flex; flex-direction: column; gap: 0.85rem; }
                                    
                                    .avail-time-row { 
                                        display: grid; 
                                        grid-template-columns: 1fr auto 1fr; 
                                        gap: 0.5rem; 
                                        align-items: center;
                                    }
                                    .avail-time-row.break-row {
                                        display: flex;
                                    }
                                    
                                    .time-pill {
                                        background: rgba(0,0,0,0.35); padding: 0.6rem 0.85rem;
                                        border-radius: 10px; border: 1px solid rgba(212,175,55,0.2);
                                        display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem;
                                        width: 100%; box-sizing: border-box; cursor: pointer;
                                    }
                                    
                                    .time-pill.break-pill {
                                        border-color: rgba(255,255,255,0.07); background: rgba(0,0,0,0.18);
                                        flex-direction: row; align-items: center; justify-content: space-between;
                                        width: 100%; padding: 0.75rem 1rem;
                                    }
                                    
                                    .time-pill label {
                                        font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
                                        color: var(--text-muted); letter-spacing: 0.5px;
                                        margin-bottom: 0.2rem; display: block;
                                    }
                                    
                                    .select-wrapper {
                                        position: relative;
                                        width: 100%;
                                        display: flex;
                                        align-items: center;
                                    }
                                    
                                    .select-wrapper::after {
                                        content: '▼';
                                        position: absolute;
                                        right: 0px;
                                        font-size: 0.55rem;
                                        color: var(--secondary-color);
                                        pointer-events: none;
                                    }
                                    
                                    .time-pill select { 
                                        font-size: 1.05rem !important; 
                                        width: 100%;
                                        background: transparent !important;
                                        border: none !important;
                                        color: var(--text-main) !important;
                                        -webkit-appearance: none;
                                        appearance: none;
                                        padding: 0 !important;
                                        margin: 0 !important;
                                        font-weight: 600;
                                    }
                                    
                                    .time-pill select:focus { outline: none; }
                                    
                                    .avail-slot-badge {
                                        display: inline-flex; align-items: center; justify-content: center;
                                        background: rgba(212,175,55,0.1); color: var(--secondary-color);
                                        font-size: 0.8rem; font-weight: 700;
                                        padding: 0.65rem 1rem; border-radius: 8px;
                                        border: 1px solid rgba(212,175,55,0.2); 
                                        width: 100%; box-sizing: border-box; margin-top: 0.5rem;
                                    }

                                    /* ── Desktop: compact table-row layout ── */
                                    @media (min-width: 992px) {'''

# Use slicing to replace the styles securely
if old_style_start in content and old_style_end in content:
    s = content.index(old_style_start)
    e = content.index(old_style_end)
    content = content[:s] + new_style + content[e:]


# 2. Update the JSX markup for time controls
old_jsx_target = '''                                                        {/* Time range row */}
                                                        <div className="avail-time-row">
                                                            <div className="time-pill">
                                                                <label>From</label>
                                                                <select className="clean-select" value={dc.start} onChange={e => updateDay(day, 'start', e.target.value)}>
                                                                    {ALL_TIMES.filter(t => t < dc.end).map(t => <option key={t}>{t}</option>)}
                                                                </select>
                                                            </div>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
                                                            <div className="time-pill">
                                                                <label>To</label>
                                                                <select className="clean-select" value={dc.end} onChange={e => updateDay(day, 'end', e.target.value)}>
                                                                    {ALL_TIMES.filter(t => t > dc.start).map(t => <option key={t}>{t}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Break row */}
                                                        <div className="avail-time-row">
                                                            {dc.breakStart ? (
                                                                <div className="time-pill break-pill">
                                                                    <label>Break</label>
                                                                    <select className="clean-select" value={dc.breakStart} onChange={e => updateDay(day, 'breakStart', e.target.value)}>
                                                                        <option value="">Off</option>
                                                                        {ALL_TIMES.filter(t => t >= dc.start && t < dc.end).map(t => <option key={t}>{t}</option>)}
                                                                    </select>
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>–</span>
                                                                    <select className="clean-select" value={dc.breakEnd || ''} onChange={e => updateDay(day, 'breakEnd', e.target.value)}>
                                                                        {ALL_TIMES.filter(t => t > dc.breakStart && t <= dc.end).map(t => <option key={t}>{t}</option>)}
                                                                    </select>
                                                                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 0.2rem', lineHeight: 1 }} onClick={() => updateDay(day, 'breakStart', '')}>✕</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className="time-pill break-pill"
                                                                    style={{ cursor: 'pointer', background: 'none', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-muted)', fontSize: '0.75rem', gap: '0.3rem' }}
                                                                    onClick={() => updateDay(day, 'breakStart', '13:00')}>
                                                                    + Add Break
                                                                </button>
                                                            )}
                                                        </div>'''

new_jsx = '''                                                        {/* Time range row */}
                                                        <div className="avail-time-row">
                                                            <div className="time-pill">
                                                                <label>From</label>
                                                                <div className="select-wrapper">
                                                                    <select value={dc.start} onChange={e => updateDay(day, 'start', e.target.value)}>
                                                                        {ALL_TIMES.filter(t => t < dc.end).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', justifyContent: 'center' }}>—</span>
                                                            <div className="time-pill">
                                                                <label>To</label>
                                                                <div className="select-wrapper">
                                                                    <select value={dc.end} onChange={e => updateDay(day, 'end', e.target.value)}>
                                                                        {ALL_TIMES.filter(t => t > dc.start).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Break row */}
                                                        <div className="avail-time-row break-row">
                                                            {dc.breakStart ? (
                                                                <div className="time-pill break-pill">
                                                                    <label style={{ margin: 0, paddingRight: '0.5rem' }}>Break</label>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                                        <div className="select-wrapper">
                                                                            <select value={dc.breakStart} onChange={e => updateDay(day, 'breakStart', e.target.value)}>
                                                                                <option value="">Off</option>
                                                                                {ALL_TIMES.filter(t => t >= dc.start && t < dc.end).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <span style={{ color: 'var(--text-muted)' }}>–</span>
                                                                        <div className="select-wrapper">
                                                                            <select value={dc.breakEnd || ''} onChange={e => updateDay(day, 'breakEnd', e.target.value)}>
                                                                                {ALL_TIMES.filter(t => t > dc.breakStart && t <= dc.end).map(t => <option key={t} value={t}>{to12(t)}</option>)}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: 'var(--text-main)', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.5rem' }} onClick={() => updateDay(day, 'breakStart', '')}>✕</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className="time-pill break-pill"
                                                                    style={{ cursor: 'pointer', background: 'none', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', padding: '0.85rem' }}
                                                                    onClick={() => updateDay(day, 'breakStart', '13:00')}>
                                                                    + Add Break Period
                                                                </button>
                                                            )}
                                                        </div>'''

content = content.replace(old_jsx_target, new_jsx)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated JSX successfully!")
