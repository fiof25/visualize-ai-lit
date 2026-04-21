'use client';

import { useState } from 'react';
import Link from 'next/link';

type Visibility = 'private' | 'public';
type Status = 'pending' | 'approved' | 'declined';
type FilterTab = 'all' | 'pending' | 'approved' | 'declined';

interface Story {
  id: number;
  title: string;
  body: string;
  risk: 'high' | 'medium' | 'low';
  domain: string;
  author: string;
  date: string;
}

const STORIES: Story[] = [
  {
    id: 1,
    title: 'Perform surgery diagnosis',
    body: 'It would be really cool to see AI perform surgery like an actual robot. We have a shortage of surgeons so it would help our issues a lot. Autonomous systems could triage patients and prioritize care pathways in real time.',
    risk: 'high', domain: 'Healthcare',
    author: 'Dr. M. Patel', date: 'Apr 18, 2026',
  },
  {
    id: 2,
    title: 'Onboarding workflows',
    body: 'AI could onboard employees which is really cool. Saves a lot of time because onboarding usually takes like 4 weeks. Automated checklists and document verification could cut that to under a week.',
    risk: 'low', domain: 'Corporate',
    author: 'J. Thornton', date: 'Apr 17, 2026',
  },
  {
    id: 3,
    title: 'AI can be a doctor',
    body: 'AI can help assess early signs of potential diseases and skin marks. Maybe with enough data it could catch things a busy GP might miss during a 10-minute appointment.',
    risk: 'high', domain: 'Healthcare',
    author: 'Anonymous', date: 'Apr 17, 2026',
  },
  {
    id: 4,
    title: 'Predict patient readmission',
    body: 'Using historical patient data, an AI model could flag patients at high risk of readmission within 30 days. This would let care teams intervene earlier and reduce strain on emergency departments.',
    risk: 'medium', domain: 'Healthcare',
    author: 'S. Nguyen', date: 'Apr 16, 2026',
  },
  {
    id: 5,
    title: 'Automate HR reporting',
    body: 'Monthly HR reports take days to compile manually. An AI pipeline could pull data from all our systems and generate compliant reports overnight, freeing up the HR team for actual human work.',
    risk: 'low', domain: 'Corporate',
    author: 'R. Okafor', date: 'Apr 15, 2026',
  },
];

const RISK_CONFIG = {
  high:   { label: 'High Risk',   dot: '#ef4444', bg: 'rgba(239,68,68,0.08)',   text: '#c0392b' },
  medium: { label: 'Medium Risk', dot: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  text: '#b45309' },
  low:    { label: 'Low Risk',    dot: '#10b981', bg: 'rgba(16,185,129,0.08)',   text: '#047857' },
};

const DOMAIN_COLOR: Record<string, string> = {
  Healthcare: 'rgba(14,165,233,0.12)',
  Corporate:  'rgba(139,92,246,0.10)',
};
const DOMAIN_TEXT: Record<string, string> = {
  Healthcare: '#0369a1',
  Corporate:  '#6d28d9',
};

export default function OrgDashboard() {
  const [visibility, setVisibility] = useState<Record<number, Visibility>>(
    () => Object.fromEntries(STORIES.map(s => [s.id, 'public']))
  );
  const [status, setStatus] = useState<Record<number, Status>>(
    () => Object.fromEntries(STORIES.map(s => [s.id, 'pending']))
  );
  const [filter, setFilter] = useState<FilterTab>('all');

  const counts = {
    all:      STORIES.length,
    pending:  STORIES.filter(s => status[s.id] === 'pending').length,
    approved: STORIES.filter(s => status[s.id] === 'approved').length,
    declined: STORIES.filter(s => status[s.id] === 'declined').length,
  };

  const visible = filter === 'all' ? STORIES : STORIES.filter(s => status[s.id] === filter);

  return (
    <>
      <style>{`
        html, body { overflow: auto !important; cursor: default !important; }
        .org-page { min-height: 100vh; background: #EDE7D8; }

        /* Sidebar */
        .sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: 220px; background: #e8e1d4; border-right: 1px solid rgba(60,45,25,0.1); display: flex; flex-direction: column; padding: 32px 0; z-index: 10; }
        .sidebar-logo { padding: 0 24px 32px; border-bottom: 1px solid rgba(60,45,25,0.1); }
        .sidebar-logo h1 { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 15px; font-weight: 400; color: #1e1810; line-height: 1.4; margin: 0; }
        .sidebar-logo p { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(30,24,16,0.4); margin: 4px 0 0; }
        .sidebar-nav { padding: 20px 12px; flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; color: rgba(30,24,16,0.55); cursor: pointer; border: none; background: none; width: 100%; text-align: left; transition: background 0.15s, color 0.15s; }
        .nav-item:hover { background: rgba(60,45,25,0.06); color: #1e1810; }
        .nav-item.active { background: rgba(60,45,25,0.1); color: #1e1810; font-weight: 500; }
        .nav-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.4; flex-shrink: 0; }
        .sidebar-back { padding: 0 12px; }
        .back-link { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(30,24,16,0.4); text-decoration: none; padding: 9px 12px; border-radius: 8px; transition: color 0.15s, background 0.15s; }
        .back-link:hover { color: #1e1810; background: rgba(60,45,25,0.06); }

        /* Main */
        .main { margin-left: 220px; padding: 48px 52px 80px; }
        .page-header { margin-bottom: 40px; }
        .page-eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(30,24,16,0.4); margin-bottom: 8px; }
        .page-title { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: clamp(30px, 3.5vw, 44px); font-weight: 400; color: #1e1810; margin: 0 0 6px; }
        .page-subtitle { font-size: 13px; color: rgba(30,24,16,0.45); }

        /* Stat pills */
        .stat-row { display: flex; gap: 10px; margin-bottom: 36px; flex-wrap: wrap; }
        .stat-pill { display: flex; align-items: center; gap: 8px; padding: 8px 16px 8px 12px; background: rgba(248,244,236,0.7); border: 1px solid rgba(60,45,25,0.12); border-radius: 38px; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .stat-pill:hover { border-color: rgba(60,45,25,0.28); }
        .stat-pill.active { background: #1e1810; border-color: #1e1810; }
        .stat-pill.active .pill-label, .stat-pill.active .pill-count { color: #f3ede0; }
        .pill-swatch { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pill-label { font-size: 12px; color: rgba(30,24,16,0.6); letter-spacing: 0.03em; }
        .pill-count { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 15px; color: #1e1810; margin-left: 2px; }

        /* Cards */
        .card-list { display: flex; flex-direction: column; gap: 12px; }
        .story-card { background: #f5f0e8; border: 1px solid rgba(60,45,25,0.11); border-radius: 18px; overflow: hidden; transition: border-color 0.3s, opacity 0.4s, box-shadow 0.2s; }
        .story-card:hover { box-shadow: 0 4px 24px rgba(30,24,16,0.06); }
        .story-card.approved { border-color: rgba(16,185,129,0.4); }
        .story-card.declined { opacity: 0.45; }
        .card-inner { display: grid; grid-template-columns: 1fr auto; }
        .card-body { padding: 26px 30px; }
        .card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
        .card-title { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 20px; font-weight: 400; color: #1e1810; margin: 0; flex: 1; line-height: 1.3; }
        .card-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
        .tag { font-size: 11px; padding: 3px 10px; border-radius: 38px; letter-spacing: 0.02em; font-weight: 500; white-space: nowrap; }
        .card-text { font-size: 13px; line-height: 1.75; color: rgba(30,24,16,0.62); margin: 0 0 14px; }
        .card-meta { display: flex; align-items: center; gap: 16px; }
        .meta-author { font-size: 11px; color: rgba(30,24,16,0.35); display: flex; align-items: center; gap: 5px; }
        .meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(30,24,16,0.2); }
        .status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 3px 9px; border-radius: 38px; font-weight: 500; letter-spacing: 0.03em; }
        .status-badge.approved { background: rgba(16,185,129,0.12); color: #047857; }
        .status-badge.declined { background: rgba(239,68,68,0.1); color: #b91c1c; }

        /* Card panel */
        .card-panel { width: 196px; border-left: 1px solid rgba(60,45,25,0.09); padding: 26px 22px; display: flex; flex-direction: column; gap: 16px; flex-shrink: 0; }
        .panel-label { font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(30,24,16,0.35); margin: 0; }
        .vis-toggle { display: flex; border: 1px solid rgba(60,45,25,0.15); border-radius: 8px; overflow: hidden; }
        .vis-btn { flex: 1; padding: 8px 0; font-size: 12px; font-family: 'Cactus Classical Serif', Georgia, serif; border: none; cursor: pointer; transition: background 0.18s, color 0.18s; background: transparent; color: rgba(30,24,16,0.45); }
        .vis-btn.on { background: #1e1810; color: #f3ede0; }
        .vis-btn:disabled { cursor: default; opacity: 0.4; }
        .panel-actions { display: flex; flex-direction: column; gap: 7px; margin-top: auto; }
        .btn-approve { padding: 10px; font-size: 12px; font-family: 'Cactus Classical Serif', Georgia, serif; background: #1e1810; color: #f3ede0; border: none; border-radius: 10px; cursor: pointer; transition: opacity 0.18s; letter-spacing: 0.02em; }
        .btn-approve:hover { opacity: 0.85; }
        .btn-decline { padding: 10px; font-size: 12px; font-family: 'Cactus Classical Serif', Georgia, serif; background: transparent; color: rgba(30,24,16,0.45); border: 1px solid rgba(60,45,25,0.18); border-radius: 10px; cursor: pointer; transition: border-color 0.18s, color 0.18s; }
        .btn-decline:hover { border-color: rgba(60,45,25,0.4); color: #1e1810; }
        .btn-undo { padding: 10px; font-size: 12px; font-family: 'Cactus Classical Serif', Georgia, serif; background: transparent; color: rgba(30,24,16,0.35); border: 1px dashed rgba(60,45,25,0.2); border-radius: 10px; cursor: pointer; }

        /* Empty */
        .empty { text-align: center; padding: 80px 0; color: rgba(30,24,16,0.3); font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 18px; }
      `}</style>

      <div className="org-page">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>Waterloo Region Health Network</h1>
            <p>Admin Portal</p>
          </div>
          <nav className="sidebar-nav">
            {(['all', 'pending', 'approved', 'declined'] as FilterTab[]).map(tab => (
              <button
                key={tab}
                className={`nav-item ${filter === tab ? 'active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                <span className="nav-dot" style={{ background: tab === 'pending' ? '#f59e0b' : tab === 'approved' ? '#10b981' : tab === 'declined' ? '#ef4444' : '#1e1810' }} />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>{counts[tab]}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-back">
            <Link href="/" className="back-link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M5 12l7 7M5 12l7-7" />
              </svg>
              Back to Canvas
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="page-header">
            <p className="page-eyebrow">Use Case Review</p>
            <h2 className="page-title">AI Use Case Responses</h2>
            <p className="page-subtitle">{counts.pending} submission{counts.pending !== 1 ? 's' : ''} awaiting review</p>
          </div>

          {/* Filter pills */}
          <div className="stat-row">
            {([
              { key: 'all',      label: 'All',      swatch: '#1e1810' },
              { key: 'pending',  label: 'Pending',  swatch: '#f59e0b' },
              { key: 'approved', label: 'Approved', swatch: '#10b981' },
              { key: 'declined', label: 'Declined', swatch: '#ef4444' },
            ] as { key: FilterTab; label: string; swatch: string }[]).map(({ key, label, swatch }) => (
              <div
                key={key}
                className={`stat-pill ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                <span className="pill-swatch" style={{ background: filter === key ? '#f3ede0' : swatch }} />
                <span className="pill-label">{label}</span>
                <span className="pill-count">{counts[key]}</span>
              </div>
            ))}
          </div>

          {/* Cards */}
          <div className="card-list">
            {visible.length === 0 && (
              <div className="empty">Nothing here yet.</div>
            )}
            {visible.map(story => {
              const s = status[story.id];
              const v = visibility[story.id];
              const risk = RISK_CONFIG[story.risk];
              return (
                <div key={story.id} className={`story-card ${s !== 'pending' ? s : ''}`}>
                  <div className="card-inner">
                    {/* Left */}
                    <div className="card-body">
                      <div className="card-top">
                        <h3 className="card-title">{story.title}</h3>
                        <div className="card-tags">
                          <span className="tag" style={{ background: risk.bg, color: risk.text }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: risk.dot, marginRight: 5, verticalAlign: 'middle' }} />
                            {risk.label}
                          </span>
                          <span className="tag" style={{ background: DOMAIN_COLOR[story.domain] ?? 'rgba(60,45,25,0.07)', color: DOMAIN_TEXT[story.domain] ?? '#1e1810' }}>
                            {story.domain}
                          </span>
                        </div>
                      </div>
                      <p className="card-text">{story.body}</p>
                      <div className="card-meta">
                        <span className="meta-author">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                          </svg>
                          {story.author}
                        </span>
                        <span className="meta-dot" />
                        <span className="meta-author">{story.date}</span>
                        {s !== 'pending' && (
                          <span className={`status-badge ${s}`}>
                            {s === 'approved' ? '✓ Published' : '✕ Declined'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right panel */}
                    <div className="card-panel">
                      <div>
                        <p className="panel-label">Visibility</p>
                        <div className="vis-toggle" style={{ marginTop: 8 }}>
                          <button
                            className={`vis-btn ${v === 'private' ? 'on' : ''}`}
                            onClick={() => setVisibility(prev => ({ ...prev, [story.id]: 'private' }))}
                            disabled={s === 'declined'}
                          >Private</button>
                          <button
                            className={`vis-btn ${v === 'public' ? 'on' : ''}`}
                            onClick={() => setVisibility(prev => ({ ...prev, [story.id]: 'public' }))}
                            disabled={s === 'declined'}
                          >Public</button>
                        </div>
                      </div>

                      <div className="panel-actions">
                        {s === 'pending' ? (
                          <>
                            <button className="btn-approve" onClick={() => setStatus(prev => ({ ...prev, [story.id]: 'approved' }))}>
                              Approve & Publish
                            </button>
                            <button className="btn-decline" onClick={() => setStatus(prev => ({ ...prev, [story.id]: 'declined' }))}>
                              Decline
                            </button>
                          </>
                        ) : (
                          <button className="btn-undo" onClick={() => setStatus(prev => ({ ...prev, [story.id]: 'pending' }))}>
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
