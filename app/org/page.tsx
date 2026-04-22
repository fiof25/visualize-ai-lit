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

        /* Back button — fixed to match profile-btn position on canvas */
        .back-link { position: fixed; top: 24px; left: 28px; z-index: 100; display: flex; align-items: center; gap: 7px; font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 14px; color: rgba(30,24,16,0.5); text-decoration: none; transition: color 0.15s; }

        /* Main */
        .main { max-width: 860px; margin: 0 auto; padding: 72px 48px 80px; }

        /* Org profile */
        .org-profile { margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid rgba(60,45,25,0.1); }
        .org-name { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 28px; font-weight: 400; color: #1e1810; margin: 0 0 16px; }
        .btn-edit-profile { display: inline-flex; align-items: center; gap: 6px; font-family: 'SF Mono', 'Fira Mono', 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(30,24,16,0.45); background: transparent; border: 0.5px solid rgba(60,45,25,0.2); padding: 6px 12px; cursor: pointer; transition: color 0.15s, border-color 0.15s; margin-bottom: 32px; }
        .btn-edit-profile:hover { color: #1e1810; border-color: rgba(60,45,25,0.45); }
        .org-stats { display: flex; gap: 28px; }
        .org-stat { display: flex; flex-direction: column; gap: 4px; }
        .org-stat-value { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 22px; color: #1e1810; line-height: 1; }
        .org-stat-label { font-family: 'SF Mono', 'Fira Mono', 'Courier New', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.09em; color: rgba(30,24,16,0.38); }

        /* Section header */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 18px; font-weight: 400; color: #1e1810; margin: 0; }

        /* Stat pills */
        .stat-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .stat-pill { display: flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(248,244,236,0.7); border: 1px solid rgba(60,45,25,0.12); border-radius: 38px; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .stat-pill:hover { border-color: rgba(60,45,25,0.28); }
        .stat-pill.active { background: #1e1810; border-color: #1e1810; }
        .stat-pill.active .pill-label, .stat-pill.active .pill-count { color: #f3ede0; }
        .pill-swatch { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .pill-label { font-family: 'SF Mono', 'Fira Mono', 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(30,24,16,0.6); }
        .pill-count { font-family: 'SF Mono', 'Fira Mono', 'Courier New', monospace; font-size: 10px; color: rgba(30,24,16,0.4); }

        /* Cards */
        .card-list { display: flex; flex-direction: column; gap: 20px; margin-top: 28px; }
        .story-card { display: flex; flex-direction: column; transition: opacity 0.4s; }
        .story-card.declined { opacity: 0.45; }
        .card-body { background: #f6f0e7; border: 1px solid #ded6c4; padding: 20px 24px; display: flex; flex-direction: column; gap: 10px; }
        .story-card.approved .card-body { border-color: rgba(16,185,129,0.4); }
        .card-top { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
        .card-title { font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 18px; font-weight: 400; color: #1e1810; margin: 0; line-height: normal; }
        .card-tags { display: flex; gap: 10px; flex-wrap: wrap; }
        .tag { font-size: 11px; padding: 4px 11px; border-radius: 38px; letter-spacing: 0.02em; font-weight: 500; white-space: nowrap; }
        .card-text { font-size: 13px; line-height: 1.7; color: #6b6965; margin: 0; }
        .card-meta { display: flex; align-items: center; gap: 14px; width: 100%; padding-top: 2px; }
        .meta-author { font-family: 'SF Mono', 'Fira Mono', 'Courier New', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(30,24,16,0.45); display: flex; align-items: center; gap: 5px; }
        .meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(30,24,16,0.2); }
        .status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 3px 9px; border-radius: 38px; font-weight: 500; letter-spacing: 0.03em; }
        .status-badge.approved { background: rgba(16,185,129,0.12); color: #047857; }
        .status-badge.declined { background: rgba(239,68,68,0.1); color: #b91c1c; }

        .card-controls-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .vis-toggle { display: flex; border: 0.5px solid #d8cfbc; overflow: hidden; }
        .vis-btn { padding: 7px 11px; font-size: 11px; font-family: 'Cactus Classical Serif', Georgia, serif; border: none; border-right: 0.5px solid #eae4d6; cursor: pointer; transition: background 0.18s; background: transparent; color: #000; white-space: nowrap; }
        .vis-btn:last-child { border-right: none; }
        .vis-btn.on { background: #d8cfbc; }
        .vis-btn:disabled { cursor: default; opacity: 0.4; }
        .btn-approve { padding: 7px 14px; font-size: 11px; font-family: 'Cactus Classical Serif', Georgia, serif; background: #000; color: #fff; border: 0.5px solid #000; cursor: pointer; transition: opacity 0.18s; white-space: nowrap; }
        .btn-approve:hover { opacity: 0.85; }
        .btn-decline { display: flex; align-items: center; justify-content: center; padding: 7px 8px; background: transparent; color: rgba(30,24,16,0.3); border: 0.5px solid #d8cfbc; cursor: pointer; transition: border-color 0.18s, color 0.18s; }
        .btn-decline:hover { border-color: rgba(60,45,25,0.4); color: #b91c1c; }
        .btn-undo { padding: 7px 14px; font-size: 11px; font-family: 'Cactus Classical Serif', Georgia, serif; background: transparent; color: rgba(30,24,16,0.35); border: 0.5px dashed #d8cfbc; cursor: pointer; white-space: nowrap; }

        /* Empty */
        .empty { text-align: center; padding: 60px 0; color: rgba(30,24,16,0.3); font-family: 'Cactus Classical Serif', Georgia, serif; font-size: 18px; }
      `}</style>

      <div className="org-page">
        <Link href="/" className="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
          </svg>
          Back
        </Link>

        <main className="main">
          {/* Org profile summary */}
          <div className="org-profile">
            <h1 className="org-name">Waterloo Region Health Network</h1>
            <button className="btn-edit-profile">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit profile
            </button>
            <div className="org-stats">
              <div className="org-stat">
                <span className="org-stat-value">{counts.all}</span>
                <span className="org-stat-label">Total</span>
              </div>
              <div className="org-stat">
                <span className="org-stat-value">{counts.pending}</span>
                <span className="org-stat-label">Pending</span>
              </div>
              <div className="org-stat">
                <span className="org-stat-value">{counts.approved}</span>
                <span className="org-stat-label">Approved</span>
              </div>
              <div className="org-stat">
                <span className="org-stat-value">{counts.declined}</span>
                <span className="org-stat-label">Declined</span>
              </div>
            </div>
          </div>

          {/* Section header + filter pills */}
          <div className="section-header">
            <h2 className="section-title">AI Use Case Responses</h2>
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
          </div>

          {/* Cards */}
          <div className="card-list">
            {visible.length === 0 && <div className="empty">Nothing here yet.</div>}
            {visible.map(story => {
              const s = status[story.id];
              const v = visibility[story.id];
              const risk = RISK_CONFIG[story.risk];
              return (
                <div key={story.id} className={`story-card ${s !== 'pending' ? s : ''}`}>
                  <div className="card-body">
                    <div className="card-top">
                      <h3 className="card-title">{story.title}</h3>
                      <div className="card-tags">
                        <span className="tag" style={{ background: risk.bg, color: risk.text }}>{risk.label}</span>
                        <span className="tag" style={{ background: DOMAIN_COLOR[story.domain] ?? 'rgba(60,45,25,0.07)', color: DOMAIN_TEXT[story.domain] ?? '#1e1810' }}>{story.domain}</span>
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
                      <div className="card-controls-right">
                        <div className="vis-toggle">
                          <button className={`vis-btn ${v === 'private' ? 'on' : ''}`} onClick={() => setVisibility(prev => ({ ...prev, [story.id]: 'private' }))} disabled={s === 'declined'}>Private</button>
                          <button className={`vis-btn ${v === 'public' ? 'on' : ''}`} onClick={() => setVisibility(prev => ({ ...prev, [story.id]: 'public' }))} disabled={s === 'declined'}>Public</button>
                        </div>
                        {s === 'pending' ? (
                          <>
                            <button className="btn-approve" onClick={() => setStatus(prev => ({ ...prev, [story.id]: 'approved' }))}>Approve and publish</button>
                            <button className="btn-decline" title="Decline" onClick={() => setStatus(prev => ({ ...prev, [story.id]: 'declined' }))}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button className="btn-undo" onClick={() => setStatus(prev => ({ ...prev, [story.id]: 'pending' }))}>Undo</button>
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
