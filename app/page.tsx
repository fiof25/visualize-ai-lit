'use client';

import dynamic from 'next/dynamic';

const OrbsSketch = dynamic(() => import('./components/OrbsSketch'), { ssr: false });

export default function Home() {
  return (
    <>
      <div id="cursor" />

      <a id="profile-btn" href="/org">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span className="btn-label">Org View</span>
      </a>

      <div id="enter-btn">Click anywhere to enter</div>

      <div id="blob-tooltip">
        <div className="tip-title" id="tip-title" />
      </div>

      <div id="story-panel">
        <div id="story-inner">
          <div id="story-tags" />
          <h2 id="story-title" />
          <p id="story-body" />
        </div>
      </div>

      <button id="share-btn">
        <span className="btn-label">Share Your Story</span>
        <span className="btn-arrow">✦</span>
      </button>

      <div id="story-form-overlay">
        <div id="form-card">
          <button id="form-close">×</button>
          <div id="form-progress">
            <span className="step-dot active" data-step="1" />
            <span className="step-dot" data-step="2" />
            <span className="step-dot" data-step="3" />
            <span className="step-dot" data-step="4" />
          </div>
          <div id="form-well">
            <div className="form-step active" data-step="1">
              <div className="form-prompt" id="prompt-1" />
              <input id="field-name" type="text" className="form-field" autoComplete="off" />
              <div className="form-nav">
                <button className="next-btn" data-next="2">Continue <span>→</span></button>
              </div>
            </div>

            <div className="form-step" data-step="2">
              <div className="form-prompt" id="prompt-2" />
              <textarea id="field-body" className="form-field form-textarea" />
              <div className="form-nav">
                <button className="back-btn" data-back="1"><span>←</span> Back</button>
                <button className="next-btn" data-next="3">Continue <span>→</span></button>
              </div>
            </div>

            <div className="form-step" data-step="3">
              <div className="form-prompt" id="prompt-3" />
              <input id="field-title" type="text" className="form-field" autoComplete="off" />
              <div className="form-tag-group">
                <div className="form-tag-label">Work Sector</div>
                <div className="form-tag-row" id="form-category-row">
                  <button className="form-tag-btn active" data-cat="healthcare">Healthcare</button>
                  <button className="form-tag-btn" data-cat="government">Government</button>
                  <button className="form-tag-btn" data-cat="education">Education</button>
                </div>
                <div className="form-tag-label">Risk Level</div>
                <div className="form-tag-row" id="form-risk-row">
                  <button className="form-tag-btn active" data-risk-level="low">Low</button>
                  <button className="form-tag-btn" data-risk-level="medium">Medium</button>
                  <button className="form-tag-btn" data-risk-level="high">High</button>
                </div>
              </div>
              <div className="form-nav">
                <button className="back-btn" data-back="2"><span>←</span> Back</button>
                <button className="next-btn" data-next="4">Preview <span>→</span></button>
              </div>
            </div>

            <div className="form-step" data-step="4">
              <div className="form-prompt" id="prompt-4" />
              <div id="story-preview-card">
                <div id="preview-title-display" />
                <div id="preview-body-display" />
                <div id="preview-author-display" />
              </div>
              <div className="form-nav">
                <button className="back-btn" data-back="3"><span>←</span> Edit</button>
                <button id="submit-story-btn">Add to canvas</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="view-toggle">
        <button id="view-prev" className="view-arrow">
          <svg width="7" height="13" viewBox="0 0 7 13" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6,1 1,6.5 6,12" />
          </svg>
        </button>
        <span id="view-label">Default View</span>
        <button id="view-next" className="view-arrow">
          <svg width="7" height="13" viewBox="0 0 7 13" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,1 6,6.5 1,12" />
          </svg>
        </button>
      </div>

      <div id="zoom-ripple" />

      <div id="zoom-sector-label">
        <span id="zoom-sector-name" />
      </div>

      <div id="risk-filter-panel">
        <button className="risk-btn active" data-risk="all">All</button>
        <button className="risk-btn" data-risk="low">Low Risk</button>
        <button className="risk-btn" data-risk="medium">Medium Risk</button>
        <button className="risk-btn" data-risk="high">High Risk</button>
      </div>

      <div id="cluster-labels">
        <div className="cluster-label" id="label-healthcare">Healthcare</div>
        <div className="cluster-label" id="label-government">Government</div>
        <div className="cluster-label" id="label-education">Education</div>
      </div>

      <OrbsSketch />
    </>
  );
}
