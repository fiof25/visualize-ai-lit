'use client';

import { useEffect, useRef } from 'react';
import { useDialKit } from 'dialkit';

const BASE_COUNT = 54;
const BASE_RADIUS = 48;

function computeBaseR(count: number) {
  return BASE_RADIUS * Math.sqrt(BASE_COUNT / count);
}

export default function OrbsSketch() {
  const containerRef = useRef<HTMLDivElement>(null);

  const params = useDialKit('Canvas', {
    dots: {
      type: 'select',
      options: ['45', '50', '54', '55', '60', '65', '70', '75', '80', '90', '100', '110', '125', '150', '175', '200'],
      default: '54',
    },
    spacing: {
      type: 'slider',
      min: 2.0,
      max: 2.4,
      step: 0.01,
      default: 2.05,
    },
  });

  const dotCountRef = useRef(BASE_COUNT);
  dotCountRef.current = Number(params.dots) || BASE_COUNT;

  const spacingRef = useRef(2.05);
  spacingRef.current = Number(params.spacing) || 2.05;

  const currentViewRef = useRef(0);
  const activeRiskRef = useRef<'all' | 'low' | 'medium' | 'high'>('all');

  useEffect(() => {
    let p5Instance: InstanceType<typeof import('p5')> | null = null;

    import('p5').then(({ default: P5 }) => {
      if (!containerRef.current) return;

      p5Instance = new P5((p: InstanceType<typeof P5>) => {
        const PR = 216, PG = 228, PB = 255;
        const COLORS = [
          [193, 121, 101],
          [111, 138, 181],
          [201, 165, 98],
          [103, 151, 123],
          [198, 151, 178],
        ] as [number, number, number][];

        const VIEWS = [
          { label: 'Default View', category: 'all' },
          { label: 'Work Sector',  category: 'testing2' },
          { label: 'Colour',       category: 'testing3' },
        ];

        function setView(idx: number) {
          // If zoomed in, left-arrow exits zoom instead of changing view
          if (zoomedSector !== null) { exitZoom(); return; }
          localViewIdx = idx;
          currentViewRef.current = idx;
          const nextCategory = VIEWS[idx].category;
          const label = document.getElementById('view-label');
          if (label) {
            label.style.opacity = '0';
            setTimeout(() => {
              label.textContent = VIEWS[idx].label;
              label.style.opacity = '1';
            }, 60);
          }
          // Update ball target colors based on new view
          setBallTargetColors(nextCategory);
          // Rearrange — Default View uses uniform grid
          if (mode !== 'freeform') {
            const targets = nextCategory === 'all'
              ? computeGridPositions(balls.length)
              : nextCategory === 'testing'
              ? computeTestingPositions()
              : nextCategory === 'testing2'
              ? computeTesting2Positions()
              : nextCategory === 'testing3'
              ? computeTesting2Positions()
              : computeWorkSectorPositions();
            balls.forEach((b, i) => { if (targets[i]) { b.tx = targets[i].x; b.ty = targets[i].y; } });
            mode = 'transitioning';
          }
          // Show/hide cluster labels
          if (nextCategory === 'worksector' || nextCategory === 'testing' || nextCategory === 'testing2' || nextCategory === 'testing3') {
            setTimeout(() => {
              const cur = VIEWS[currentViewRef.current].category;
              if ((cur === 'worksector' || cur === 'testing' || cur === 'testing2' || cur === 'testing3') && zoomedSector === null) {
                updateClusterLabels();
                document.getElementById('cluster-labels')?.classList.add('visible');
              }
            }, 900);
          } else {
            document.getElementById('cluster-labels')?.classList.remove('visible');
          }
        }

        const cursorEl = document.getElementById('cursor');
        let W: number, H: number;
        const mouse = { x: -9999, y: -9999 };
        let balls: Ball[] = [];
        let simT = 0;
        let mode: 'freeform' | 'transitioning' | 'grid' = 'freeform';
        let hoveredBlob = -1;
        let prevDotCount = dotCountRef.current;
        let prevSpacing = spacingRef.current;
        let localViewIdx = 0;
        let zoomedSector: string | null = null;
        let hoveredCluster: string | null = null;
        const SECTOR_COLORS: Record<string, [number, number, number]> = {
          healthcare: [193, 121, 101],
          government: [111, 138, 181],
          education:  [201, 165, 98],
        };
        const sectorInfo: Record<string, { cx: number; cy: number; r: number }> = {};

        let bobT = 0;
        interface RingParam { cx: number; cy: number; r: number; baseAngle: number }
        let ballRingParams: (RingParam | null)[] = [];

        function wrand() {
          const x = p.random();
          return Math.pow((x - 0.5) * 1.58740105, 3) + 0.5;
        }

        interface Poly { verts: { x: number; y: number }[]; mods: number[] }

        function growPoly({ verts, mods }: Poly): Poly {
          const newV: { x: number; y: number }[] = [], newM: number[] = [];
          const n = verts.length;
          const clamp = (m: number) => Math.min(0.92, Math.max(0.05, m + (wrand() - 0.5) * 0.12));

          for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const v1 = verts[i], v2 = verts[j];
            const mod = mods[i];
            newV.push({ x: v1.x, y: v1.y });
            newM.push(clamp(mod));
            const sx = v2.x - v1.x, sy = v2.y - v1.y;
            const len = Math.hypot(sx, sy);
            const t = wrand();
            let mx = v1.x + sx * t, my = v1.y + sy * t;
            const perp = Math.atan2(sy, sx) - Math.PI / 2 + (wrand() - 0.5) * Math.PI / 4;
            const disp = wrand() * len * 0.5 * mod;
            mx += Math.cos(perp) * disp;
            my += Math.sin(perp) * disp;
            newV.push({ x: mx, y: my });
            newM.push(clamp(mod));
          }
          return { verts: newV, mods: newM };
        }

        function translatePoly(poly: Poly, ox: number, oy: number): Poly {
          return { verts: poly.verts.map(v => ({ x: v.x + ox, y: v.y + oy })), mods: poly.mods.slice() };
        }

        function drawPoly({ verts }: Poly) {
          const n = verts.length;
          p.beginShape();
          p.curveVertex(verts[n - 1].x, verts[n - 1].y);
          for (const { x, y } of verts) p.curveVertex(x, y);
          p.curveVertex(verts[0].x, verts[0].y);
          p.curveVertex(verts[1].x, verts[1].y);
          p.endShape();
        }

        function flowAngle(x: number, y: number, t: number) {
          return (
            Math.sin(x * 0.0028 + t * 0.22) * Math.cos(y * 0.0022 + t * 0.18) +
            Math.cos(x * 0.0018 - y * 0.0024 + t * 0.14) * 0.55 +
            Math.sin(x * 0.004 + y * 0.003 + t * 0.30) * 0.3
          ) * Math.PI;
        }

        class Ball {
          x: number; y: number; vx: number; vy: number;
          color: [number, number, number];
          origColor: [number, number, number];
          targetColor: [number, number, number];
          displayScale = 1;
          phase: number; wobble: number; pulseT: number;
          baseR: number; r: number;
          tx = 0; ty = 0;
          displayAlpha = 2;
          cachedPolyLocal: Poly | null = null;
          polyAge = 999;

          constructor(i: number, total: number) {
            const ang = (i / total) * Math.PI * 2 + Math.random() * 0.9;
            const spread = 0.18 + Math.random() * 0.62;
            this.x = W * 0.5 + Math.cos(ang) * W * spread;
            this.y = H * 0.5 + Math.sin(ang) * H * spread * 0.75;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.color = [...COLORS[i % COLORS.length]] as [number, number, number];
            this.origColor = [...this.color] as [number, number, number];
            this.targetColor = [...this.color] as [number, number, number];
            this.phase = Math.random() * Math.PI * 2;
            this.wobble = 0.35 + Math.random() * 0.9;
            this.pulseT = Math.random() * Math.PI * 2;
            this.baseR = computeBaseR(total);
            this.r = this.baseR;
          }

          tick(t: number, mx: number, my: number) {
            this.pulseT += 0.010;
            this.r = this.baseR * (1 + Math.sin(this.pulseT) * 0.010);
            const angle = flowAngle(this.x, this.y, t + this.phase * 0.4);
            const fMag = 0.010 * this.wobble;
            this.vx += Math.cos(angle) * fMag;
            this.vy += Math.sin(angle) * fMag;
            const dx = this.x - mx, dy = this.y - my;
            const md = Math.hypot(dx, dy);
            if (md < 220 && md > 0.5) {
              const f = ((220 - md) / 220) ** 2.2;
              this.vx += (dx / md) * f;
              this.vy += (dy / md) * f;
            }
            const cd = Math.hypot(this.x - W * 0.5, this.y - H * 0.5);
            const maxD = Math.min(W, H) * 0.68;
            if (cd > maxD) {
              const pull = (cd - maxD) * 0.00026;
              this.vx += (W * 0.5 - this.x) / cd * pull;
              this.vy += (H * 0.5 - this.y) / cd * pull;
            }
            this.vx *= 0.970; this.vy *= 0.970;
            const spd = Math.hypot(this.vx, this.vy);
            if (spd > 2.0) { this.vx = this.vx / spd * 2.0; this.vy = this.vy / spd * 2.0; }
            this.x += this.vx; this.y += this.vy;
            const pad = this.r * 0.4;
            const topPad = Math.max(pad, H * 0.13 + this.r);
            if (this.x < pad)     this.vx += (pad - this.x) * 0.06;
            if (this.x > W - pad) this.vx -= (this.x - (W - pad)) * 0.06;
            if (this.y < topPad)  this.vy += (topPad - this.y) * 0.06;
            if (this.y > H - pad) this.vy -= (this.y - (H - pad)) * 0.06;
          }
        }

        function resolveAll() {
          for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
              const a = balls[i], b = balls[j];
              const dx = b.x - a.x, dy = b.y - a.y;
              const dist = Math.hypot(dx, dy) || 0.001;
              const minD = a.r + b.r + 4;
              if (dist >= minD) continue;
              const nx = dx / dist, ny = dy / dist;
              const ov = (minD - dist) * 0.5;
              a.x -= nx * ov; a.y -= ny * ov;
              b.x += nx * ov; b.y += ny * ov;
              const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dv > 0) continue;
              const imp = dv * 0.25;
              a.vx -= imp * nx; a.vy -= imp * ny;
              b.vx += imp * nx; b.vy += imp * ny;
            }
          }
        }

        function scatter(cx: number, cy: number) {
          balls.forEach(b => {
            const dx = b.x - cx, dy = b.y - cy;
            const d = Math.hypot(dx, dy) || 0.5;
            const R = 460;
            if (d < R) {
              const f = ((R - d) / R) ** 1.5 * 5.0;
              b.vx += (dx / d) * f;
              b.vy += (dy / d) * f;
            }
          });
        }

        function renderWatercolour(ball: Ball, count: number) {
          const [rv, gv, bv] = ball.color;
          const numLayers = count <= 60 ? 16 : count <= 100 ? 10 : count <= 150 ? 7 : 5;
          const refreshEvery = count <= 60 ? 2 : count <= 120 ? 3 : 6;
          (p as unknown as { fill: (...args: number[]) => void }).fill(rv, gv, bv, ball.displayAlpha);
          p.noStroke();

          ball.polyAge++;
          if (!ball.cachedPolyLocal || ball.polyAge >= refreshEvery) {
            ball.polyAge = 0;
            const n = 8;
            const verts = Array.from({ length: n }, (_, i) => {
              const a = (i / n) * Math.PI * 2;
              return { x: Math.cos(a) * ball.r, y: Math.sin(a) * ball.r };
            });
            const mods = Array.from({ length: n }, () => p.random(0.32, 0.90));
            ball.cachedPolyLocal = growPoly(growPoly({ verts, mods }));
          }
          let poly = translatePoly(ball.cachedPolyLocal, ball.x, ball.y);
          for (let i = 0; i < numLayers; i++) {
            if (i === Math.floor(numLayers / 2)) poly = growPoly(poly);
            drawPoly(growPoly(poly));
          }
        }

        function computeGridPositions(count: number) {
          const aspect = W / H;
          const cols = Math.max(2, Math.round(Math.sqrt(count * aspect)));
          const rows = Math.ceil(count / cols);
          const padX = W * 0.08;
          const padYTop = H * 0.13;
          const padYBottom = H * 0.08;
          const positions: { x: number; y: number }[] = [];
          const colStep = cols > 1 ? (W - padX * 2) / (cols - 1) * 0.92 : 0;
          const rowStep = rows > 1 ? (H - padYTop - padYBottom) / (rows - 1) * 0.92 : 0;
          const gridW = (cols - 1) * colStep;
          const gridH = (rows - 1) * rowStep;
          const startX = (W - gridW) / 2;
          const startY = padYTop + ((H - padYTop - padYBottom) - gridH) / 2;
          for (let i = 0; i < count; i++) {
            const c = i % cols;
            const r = Math.floor(i / cols);
            positions.push({ x: startX + c * colStep, y: startY + r * rowStep });
          }
          return positions;
        }

        function circularCluster(cx: number, cy: number, n: number, baseR: number, spcMult = spacingRef.current) {
          // Hexagonal close-pack: uniform spacing, natural faceted edge (not perfect circle, not random)
          const spc  = baseR * spcMult;
          const rowH = spc * 0.866;           // sin(60°) — vertical row pitch

          const gridR = Math.ceil(Math.sqrt(n) * 1.6);
          const candidates: { x: number; y: number; d: number }[] = [];
          for (let row = -gridR; row <= gridR; row++) {
            for (let col = -gridR; col <= gridR; col++) {
              const x = cx + col * spc + (((row % 2) + 2) % 2) * spc * 0.5;
              const y = cy + row * rowH;
              candidates.push({ x, y, d: Math.hypot(x - cx, y - cy) });
            }
          }
          candidates.sort((a, b) => a.d - b.d);
          return candidates.slice(0, n).map(({ x, y }) => ({ x, y }));
        }

        function circularClusterWithHole(cx: number, cy: number, n: number, baseR: number, spcMult = spacingRef.current) {
          // Same as circularCluster but leaves the centre cell empty for label readability
          const spc  = baseR * spcMult;
          const rowH = spc * 0.866;
          const gridR = Math.ceil(Math.sqrt(n + 1) * 1.6);
          const candidates: { x: number; y: number; d: number }[] = [];
          for (let row = -gridR; row <= gridR; row++) {
            for (let col = -gridR; col <= gridR; col++) {
              const x = cx + col * spc + (((row % 2) + 2) % 2) * spc * 0.5;
              const y = cy + row * rowH;
              candidates.push({ x, y, d: Math.hypot(x - cx, y - cy) });
            }
          }
          candidates.sort((a, b) => a.d - b.d);
          return candidates.slice(1, n + 1).map(({ x, y }) => ({ x, y }));
        }

        function computeTesting2Positions() {
          const count = balls.length;
          const baseR = computeBaseR(count);
          const clusterSeeds = [
            { cx: W * 0.17, cy: H * 0.42 },
            { cx: W * 0.50, cy: H * 0.54 },
            { cx: W * 0.83, cy: H * 0.44 },
          ];
          const groups: Record<string, number[]> = { healthcare: [], government: [], education: [] };
          for (let i = 0; i < count; i++) {
            const cat = stories[i]?.category;
            if (cat === 'healthcare') groups.healthcare.push(i);
            else if (cat === 'government') groups.government.push(i);
            else groups.education.push(i);
          }
          const positions: { x: number; y: number }[] = new Array(count);
          const cats = ['healthcare', 'government', 'education'] as const;
          cats.forEach((cat, ci) => {
            const { cx: ccx, cy: ccy } = clusterSeeds[ci];
            const indices = groups[cat];
            const clusterPos = circularClusterWithHole(ccx, ccy, indices.length, baseR, 1.88);
            let maxR = 0;
            clusterPos.forEach(p => {
              const d = Math.hypot(p.x - ccx, p.y - ccy);
              if (d > maxR) maxR = d;
            });
            sectorInfo[cat] = { cx: ccx, cy: ccy, r: maxR + baseR * 1.5 };
            indices.forEach((idx, j) => { positions[idx] = clusterPos[j]; });
          });
          return positions;
        }

        function computeWorkSectorPositions() {
          const count = balls.length;
          const baseR = computeBaseR(count);
          // Freeform: each cluster sits at a different height so the layout feels organic
          const clusterSeeds = [
            { cx: W * 0.17, cy: H * 0.42 },
            { cx: W * 0.50, cy: H * 0.54 },
            { cx: W * 0.83, cy: H * 0.44 },
          ];

          const groups: Record<string, number[]> = { healthcare: [], government: [], education: [] };
          for (let i = 0; i < count; i++) {
            const cat = stories[i]?.category;
            if (cat === 'healthcare') groups.healthcare.push(i);
            else if (cat === 'government') groups.government.push(i);
            else groups.education.push(i);
          }

          const positions: { x: number; y: number }[] = new Array(count);
          const cats = ['healthcare', 'government', 'education'] as const;

          cats.forEach((cat, ci) => {
            const { cx: ccx, cy: ccy } = clusterSeeds[ci];
            const indices = groups[cat];
            const clusterPos = circularCluster(ccx, ccy, indices.length, baseR, 1.88);
            let maxR = 0;
            clusterPos.forEach(p => {
              const d = Math.hypot(p.x - ccx, p.y - ccy);
              if (d > maxR) maxR = d;
            });
            sectorInfo[cat] = { cx: ccx, cy: ccy, r: maxR + baseR * 1.5 };
            indices.forEach((idx, j) => { positions[idx] = clusterPos[j]; });
          });

          return positions;
        }

        function computeTestingPositions() {
          const count = balls.length;
          const baseR = computeBaseR(count);
          const clusterSeeds = [
            { cx: W * 0.17, cy: H * 0.42 },
            { cx: W * 0.50, cy: H * 0.54 },
            { cx: W * 0.83, cy: H * 0.44 },
          ];
          const groups: Record<string, number[]> = { healthcare: [], government: [], education: [] };
          for (let i = 0; i < count; i++) {
            const cat = stories[i]?.category;
            if (cat === 'healthcare') groups.healthcare.push(i);
            else if (cat === 'government') groups.government.push(i);
            else groups.education.push(i);
          }

          const positions: { x: number; y: number }[] = new Array(count);
          ballRingParams = new Array(count).fill(null);

          const cats = ['healthcare', 'government', 'education'] as const;
          cats.forEach((cat, ci) => {
            const { cx, cy } = clusterSeeds[ci];
            const indices = groups[cat];
            const n = indices.length;
            // Ring radius: space all orbs with slight gaps around the circumference
            const ringR = Math.max(baseR * 1.625, (n * baseR * 1.43) / (2 * Math.PI));
            sectorInfo[cat] = { cx, cy, r: ringR + baseR * 0.975 };

            indices.forEach((ballIdx, j) => {
              const baseAngle = (j / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
              positions[ballIdx] = {
                x: cx + Math.cos(baseAngle) * ringR,
                y: cy + Math.sin(baseAngle) * ringR,
              };
              ballRingParams[ballIdx] = { cx, cy, r: ringR, baseAngle };
            });
          });

          return positions;
        }

        function computeZoomedPositions(sector: string) {
          const positions: { x: number; y: number }[] = new Array(balls.length);
          const chosen: number[] = [], others: number[] = [];
          for (let i = 0; i < balls.length; i++) {
            (stories[i]?.category === sector ? chosen : others).push(i);
          }
          // Compact centred grid — step capped by orb size so dots stay close
          const n = chosen.length;
          const aspect = W / H;
          const cols = Math.max(2, Math.round(Math.sqrt(n * aspect)));
          const rows = Math.ceil(n / cols);
          const baseR = computeBaseR(balls.length);
          const step = baseR * 3.2; // 1.2× scale diameter (2.4×) + comfortable gap
          const gridW = (cols - 1) * step;
          const gridH = (rows - 1) * step;
          const ox = W * 0.5 - gridW / 2;
          const oy = H * 0.5 - gridH / 2;
          chosen.forEach((idx, j) => {
            positions[idx] = {
              x: ox + (j % cols) * step,
              y: oy + Math.floor(j / cols) * step,
            };
          });
          others.forEach((idx, j) => {
            const angle = (j / Math.max(others.length, 1)) * Math.PI * 2;
            positions[idx] = { x: W * 0.5 + Math.cos(angle) * 40, y: H + 180 };
          });
          return positions;
        }

        function updateClusterLabels() {
          const cats = ['healthcare', 'government', 'education'] as const;
          cats.forEach(cat => {
            const el = document.getElementById(`label-${cat}`);
            if (!el || !sectorInfo[cat]) return;
            const { cx, cy } = sectorInfo[cat];
            el.style.left = cx + 'px';
            el.style.top = cy + 'px';
          });
        }

        function triggerRipple(cx: number, cy: number, color: [number, number, number]) {
          const ripple = document.getElementById('zoom-ripple');
          if (!ripple) return;
          ripple.style.left = cx + 'px';
          ripple.style.top = cy + 'px';
          ripple.style.background = `rgb(${color[0]},${color[1]},${color[2]})`;
          ripple.classList.remove('active', 'fade');
          requestAnimationFrame(() => requestAnimationFrame(() => {
            ripple.classList.add('active');
            setTimeout(() => {
              ripple.classList.add('fade');
              setTimeout(() => ripple.classList.remove('active', 'fade'), 400);
            }, 500);
          }));
        }

        function setBallTargetColors(category: string | null) {
          balls.forEach((b, i) => {
            const sectorCat = stories[i]?.category;
            b.targetColor = category === 'testing3'
              ? ([...(SECTOR_COLORS[sectorCat] ?? b.origColor)] as [number, number, number])
              : ([...b.origColor] as [number, number, number]);
          });
        }

        const SECTOR_DISPLAY: Record<string, string> = {
          healthcare: 'Healthcare',
          government: 'Government',
          education: 'Education',
        };

        function enterZoom(sector: string) {
          zoomedSector = sector;
          const info = sectorInfo[sector];
          if (info) triggerRipple(info.cx, info.cy, SECTOR_COLORS[sector]);
          const targets = computeZoomedPositions(sector);
          balls.forEach((b, i) => { if (targets[i]) { b.tx = targets[i].x; b.ty = targets[i].y; } });
          mode = 'transitioning';
          // Hide cluster labels, show back indicator
          document.getElementById('cluster-labels')?.classList.remove('visible');
          document.getElementById('view-prev')?.classList.add('back-active');
          // Show sector label above dots
          const nameEl = document.getElementById('zoom-sector-name');
          if (nameEl) nameEl.textContent = SECTOR_DISPLAY[sector] ?? sector;
          setTimeout(() => document.getElementById('zoom-sector-label')?.classList.add('visible'), 300);
          setTimeout(() => document.getElementById('risk-filter-panel')?.classList.add('visible'), 420);
        }

        function exitZoom() {
          const returnCat = VIEWS[currentViewRef.current].category;
          zoomedSector = null;
          const targets = returnCat === 'testing' ? computeTestingPositions()
            : returnCat === 'testing2' || returnCat === 'testing3' ? computeTesting2Positions()
            : computeWorkSectorPositions();
          balls.forEach((b, i) => { if (targets[i]) { b.tx = targets[i].x; b.ty = targets[i].y; } });
          mode = 'transitioning';
          // Restore view label
          const label = document.getElementById('view-label');
          if (label) {
            label.style.opacity = '0';
            setTimeout(() => {
              label.textContent = VIEWS[currentViewRef.current].label;
              label.style.opacity = '1';
            }, 60);
          }
          document.getElementById('view-prev')?.classList.remove('back-active');
          document.getElementById('zoom-sector-label')?.classList.remove('visible');
          document.getElementById('risk-filter-panel')?.classList.remove('visible');
          activeRiskRef.current = 'all';
          document.querySelectorAll('.risk-btn').forEach(btn => {
            (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.risk === 'all');
          });
          // Show cluster labels after transition
          setTimeout(() => {
            if (zoomedSector === null && (VIEWS[currentViewRef.current].category === 'worksector' || VIEWS[currentViewRef.current].category === 'testing' || VIEWS[currentViewRef.current].category === 'testing2' || VIEWS[currentViewRef.current].category === 'testing3')) {
              updateClusterLabels();
              document.getElementById('cluster-labels')?.classList.add('visible');
            }
          }, 900);
        }

        type Story = { title: string; body: string; isPlaceholder: boolean; category: string; risk: 'low' | 'medium' | 'high' };

        const REAL_STORIES: Story[] = [
          { title: 'The hour I get back every day', body: 'I used to spend the first 90 minutes of every morning just triaging emails and writing status updates. Now I do that in 15. I don\'t think about it much anymore — it just happens, quietly, in the background.\n\n— Dr. M. Patel', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'A second opinion that never sleeps', body: 'When I\'m stuck on a differential at midnight, I\'ll talk through the case out loud — well, in text — and something about externalising the reasoning helps. It catches things I\'ve anchored on.\n\n— Anonymous', isPlaceholder: false, category: 'healthcare', risk: 'medium' },
          { title: 'Onboarding used to take four weeks', body: 'We had a new coordinator start in January. She was fully independent by day six. The AI handled the document checklist, the policy Q&A, the system walkthroughs. I just did the human parts.\n\n— J. Thornton', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'I stopped dreading the chart notes', body: 'I became a nurse to be with patients, not to type. For two years the notes felt like a second job. Now I review and sign instead of starting from scratch. That difference is enormous.\n\n— R. Okafor', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'It asked me a question I hadn\'t thought to ask', body: 'I was drafting a care plan and the AI flagged a potential interaction I\'d overlooked. Not alarming — just a quiet nudge. That\'s the version of this I trust.\n\n— S. Nguyen', isPlaceholder: false, category: 'healthcare', risk: 'medium' },
          { title: 'My research assistant doesn\'t need sleep', body: 'I\'m a PhD student. Literature reviews used to eat weeks. I still read everything myself — I have to — but now I know what I need to read first.\n\n— Anonymous', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'The meeting summary no one wanted to write', body: 'Every week someone had to turn 45 minutes of discussion into three bullet points and a decision log. We rotated the misery. Now it\'s just done by the time we close the call.\n\n— T. Eze', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'Writing felt impossible after my accident', body: 'I have a tremor now. Typing long documents was frustrating and slow. Voice-to-structured-text changed what I can produce in a day. I don\'t think I could do this job otherwise.\n\n— P. Walsh', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'It translated the jargon for my patient\'s family', body: 'We had a family who spoke limited English and were frightened. I used it to draft a plain-language summary of the diagnosis. The relief on their faces when they understood — that mattered.\n\n— Dr. A. Sinha', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'Not a replacement, a rehearsal space', body: 'I use it to stress-test arguments before I present them. If it can find the hole in my reasoning, so can my colleagues. It\'s like having a very patient devil\'s advocate on call.\n\n— C. Moreau', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'The grant proposal I almost didn\'t write', body: 'I had the idea but not the bandwidth. I talked through the concept, got a rough structure back, and spent my actual energy on the science. We got the funding.\n\n— Dr. K. Lindqvist', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'Scheduling across six time zones', body: 'Our team is genuinely global. The logistics used to be a puzzle I solved manually every week. Now it\'s handled. I just confirm.\n\n— B. Adeyemi', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'It helped me write my first performance review', body: 'I was promoted to manager at 27 and had no idea how to give structured feedback in writing. I\'d talk through what I wanted to say, and it helped me find the words that were fair and clear.\n\n— Anonymous', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'The patient portal messages were drowning us', body: 'We were getting 200+ messages a week. Now the routine ones — refill requests, appointment questions — are drafted for review before anyone touches them. We actually respond same-day now.\n\n— M. Castillo', isPlaceholder: false, category: 'healthcare', risk: 'medium' },
          { title: 'I used it to understand my own diagnosis', body: 'The specialist used terms I didn\'t know. I went home and had it explained to me in plain language, then came back with real questions. I felt like a participant in my own care.\n\n— F. Bergström', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'Discharge instructions that actually land', body: 'We were handing patients a four-page PDF on their way out. Nobody read it. Now we generate a one-page plain-language summary tailored to what they were actually admitted for. Readmissions in our unit dropped.\n\n— L. Fairbanks', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'The triage flag I almost missed', body: 'At 2am, running on fours hours of sleep, I missed a lab trend that the AI flagged. I\'m not sure I would have caught it in time. That one still sits with me.\n\n— Anonymous', isPlaceholder: false, category: 'healthcare', risk: 'high' },
          { title: 'My patients with low literacy finally get it', body: 'I work in a community clinic. A lot of my patients struggle with written instructions. Now I can generate materials at a fifth-grade reading level in under a minute. That used to take me 20.\n\n— Dr. O. Fernández', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'It surfaced a pattern across 800 patients', body: 'I\'m a researcher. We had a dataset I\'d been sitting on for months because the analysis felt overwhelming. Within a week of using AI-assisted tooling I had a hypothesis worth testing.\n\n— Dr. Y. Tanaka', isPlaceholder: false, category: 'healthcare', risk: 'medium' },
          { title: 'Consent forms in six languages', body: 'Our hospital serves a neighbourhood where English is a second language for most patients. We use AI to produce consent form translations that our bilingual staff then review. Throughput is up. Errors are down.\n\n— H. Reyes', isPlaceholder: false, category: 'healthcare', risk: 'medium' },
          { title: 'I finally have time to sit with patients', body: 'Documentation was stealing 90 minutes from every shift. I\'d go home exhausted from typing, not from caring. That ratio has flipped. I remember why I became a doctor again.\n\n— Dr. B. Osei', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'It recommended a medication I wouldn\'t have chosen', body: 'The AI flagged an alternative treatment backed by three studies I hadn\'t read. I reviewed them, consulted a colleague, and changed the plan. The patient did better. But it made me think hard about trust.\n\n— Anonymous', isPlaceholder: false, category: 'healthcare', risk: 'high' },
          { title: 'Scheduling that doesn\'t break people', body: 'Nurse scheduling in our ward used to cause arguments every month. Now the AI generates a first draft that accounts for preferences, seniority, and coverage minimums. People still negotiate — but from a fair starting point.\n\n— C. Nakamura', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'The referral letters write themselves', body: 'I do about 30 referrals a week. Each one used to take 10 minutes to draft. Now I review and sign. That\'s four hours back. I use them to see more patients.\n\n— Dr. R. Mehta', isPlaceholder: false, category: 'healthcare', risk: 'low' },
          { title: 'Summarising 40 years of policy in an afternoon', body: 'We needed a briefing on the legislative history of a regulation that predated most of my team. I used AI to digest the archive and produce a working summary. It wasn\'t perfect. But it was a start.\n\n— P. Drummond', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'Constituent letters that don\'t sound like form letters', body: 'We receive thousands of letters a month. The AI drafts personalised responses keyed to the specific issue raised. Our approval rating on correspondence went up 18 points in the first quarter.\n\n— M. Johanssen', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'It flagged the anomaly before the audit did', body: 'Our team uses AI to scan procurement records for irregular patterns. It flagged a cluster of small-value contracts that would have slipped through manual review. That\'s the version of this I can defend.\n\n— Anonymous', isPlaceholder: false, category: 'government', risk: 'medium' },
          { title: 'The benefits form no one could finish', body: 'Our disability application was 28 pages. Completion rates were low. Denials were high. I used AI to prototype a conversational version. Completion is up. So are approvals. But I still wonder who we\'re missing.\n\n— J. Okafor', isPlaceholder: false, category: 'government', risk: 'high' },
          { title: 'Translation at the speed of need', body: 'In emergency response, we have minutes to communicate evacuation instructions to communities that speak 14 different languages. AI translation plus human review got us there. It would have been impossible otherwise.\n\n— T. Vasquez', isPlaceholder: false, category: 'government', risk: 'medium' },
          { title: 'Policy analysis used to take a week', body: 'Before a vote, we\'d need days to summarise the implications of a bill. Now I can have a structured briefing in two hours. I still read it critically — the AI has been wrong — but I start from a much better position.\n\n— R. Castillo', isPlaceholder: false, category: 'government', risk: 'medium' },
          { title: 'Freedom of information, faster', body: 'We process hundreds of FOI requests monthly. The time from receipt to response used to average 22 days. The AI handles the initial classification and redaction review. We\'re down to 9.\n\n— A. Whitfield', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'Budget reports that junior staff can actually write', body: 'We had analysts spending three days formatting and narrating budget tables. Now they spend three hours — and learn more in the process because the AI surfaces comparisons they hadn\'t considered.\n\n— D. Mbeki', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'The compliance gap we didn\'t know we had', body: 'A routine AI-assisted review of our procurement policies flagged 14 clauses that no longer met updated federal guidelines. We fixed them before the inspection. I don\'t want to think about what happens if we hadn\'t.\n\n— L. Sørensen', isPlaceholder: false, category: 'government', risk: 'medium' },
          { title: 'Public consultation, actually consulted', body: 'We ran a planning consultation that generated 4,000 submissions. I used AI to cluster and theme them so the committee could genuinely engage with the range of views. First time we\'ve ever done that.\n\n— F. Patel', isPlaceholder: false, category: 'government', risk: 'low' },
          { title: 'My feedback used to be a paragraph. Now it\'s a conversation.', body: 'I teach 180 students. Detailed written feedback wasn\'t possible at that scale. Now I give voice notes, the AI structures them, and students get something specific. Engagement in my course went up noticeably.\n\n— Prof. A. Mbeki', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'The student I almost gave up on', body: 'She wasn\'t engaging with written feedback. I used an AI tutoring tool to let her work through the same concepts in a conversational way. She passed. I still think about how many students I might have missed before.\n\n— T. Lindqvist', isPlaceholder: false, category: 'education', risk: 'medium' },
          { title: 'Lesson plans that adapt to the room', body: 'I teach in a school where reading levels in one class can span six years. AI helps me differentiate materials quickly — same concept, three different entry points. I couldn\'t do it by hand for every lesson.\n\n— C. Obi', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'My dyslexic students have a chance now', body: 'I work with students with learning differences. AI-powered text-to-speech and reformatting tools have changed what they can access independently. Some of them read more than they ever have.\n\n— S. Riordan', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'Research methodology explained at 11pm', body: 'My PhD students message at all hours. Now I tell them to try working through it with the AI first. Half the time they solve it themselves. The other half, they come to me with a much better-formed question.\n\n— Prof. R. Nakamura', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'Grading that might be more consistent than I am', body: 'I piloted AI-assisted grading on short-answer questions against my own marks. The correlation was high — and it caught some inconsistencies in my rubric that I\'d been applying unevenly. That was humbling.\n\n— Anonymous', isPlaceholder: false, category: 'education', risk: 'high' },
          { title: 'Admin that was eating my research time', body: 'As department chair I was spending 30% of my time on scheduling, reporting, and correspondence. Getting that down to 15% gave me back a day a week. I\'ve restarted the paper I abandoned in 2021.\n\n— Prof. K. Okonkwo', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'The curriculum review we\'d been delaying for years', body: 'We had a programme review due and no bandwidth. AI helped us analyse graduate outcome data against learning objectives and surface misalignments. It took two weeks instead of six months.\n\n— Dr. M. Álvarez', isPlaceholder: false, category: 'education', risk: 'low' },
          { title: 'Students gaming the system', body: 'I introduced AI-assisted writing support. Then I noticed work getting better and thinking getting shallower. I don\'t think the tool is the problem — but I had to redesign my assessments completely, and I\'m still not sure I got it right.\n\n— Anonymous', isPlaceholder: false, category: 'education', risk: 'high' },
          { title: 'Early warning, early help', body: 'We built a dashboard that flags students whose engagement patterns suggest they\'re struggling — before a missed deadline becomes a dropped module. Pastoral referrals are up. Withdrawals are down. But we talk a lot about what the data means.\n\n— J. Fairweather', isPlaceholder: false, category: 'education', risk: 'medium' },
        ];

        const WORK_SECTOR_CATS = ['healthcare', 'government', 'education'];

        function buildStories(count: number): Story[] {
          const arr: Story[] = [...REAL_STORIES];
          while (arr.length < count) {
            const cat = WORK_SECTOR_CATS[arr.length % WORK_SECTOR_CATS.length];
            arr.push({ title: `Story ${arr.length + 1}`, body: 'This story is coming soon.', isPlaceholder: true, category: cat, risk: 'low' as const });
          }
          return arr.slice(0, count);
        }

        let stories = buildStories(dotCountRef.current);

        function openStory(i: number) {
          const storyTitle = document.getElementById('story-title');
          const storyBody = document.getElementById('story-body');
          const storyPanel = document.getElementById('story-panel');
          const storyTagsEl = document.getElementById('story-tags');
          if (storyTitle) storyTitle.textContent = stories[i].title;
          if (storyBody) storyBody.textContent = stories[i].body;
          if (storyTagsEl) {
            const s = stories[i];
            if (!s.isPlaceholder) {
              const sc = SECTOR_COLORS[s.category] ?? [150, 130, 110];
              // Apply parchment MULTIPLY (242,237,225) so tag matches the canvas dot appearance
              const mul = (c: number, bg: number) => Math.round(c * bg / 255);
              const sectorBg = `rgb(${mul(sc[0],242)},${mul(sc[1],237)},${mul(sc[2],225)})`;
              const riskBg = s.risk === 'low' ? '#7BBF8A' : s.risk === 'medium' ? '#E6A840' : '#D16B5A';
              const sectorLabel = SECTOR_DISPLAY[s.category] ?? s.category;
              const riskLabel = s.risk === 'low' ? 'Low Risk' : s.risk === 'medium' ? 'Medium Risk' : 'High Risk';
              const lt = 'rgba(243,237,224,0.92)';
              storyTagsEl.innerHTML = `<span class="story-tag" style="background:${sectorBg};color:${lt}">${sectorLabel}</span><span class="story-tag" style="background:${riskBg};color:${lt}">${riskLabel}</span>`;
              storyTagsEl.style.display = 'flex';
            } else {
              storyTagsEl.style.display = 'none';
            }
          }
          storyPanel?.classList.add('open');
        }

        function typewriter(el: HTMLElement, text: string, onDone?: () => void) {
          (el as any).__cancelTypewriter?.();
          el.innerHTML = '';
          const caret = document.createElement('span');
          caret.className = 'caret';
          el.appendChild(caret);
          let i = 0;
          let active = true;
          (el as any).__cancelTypewriter = () => { active = false; };
          const BASE = 36;
          function tick() {
            if (!active) return;
            if (i < text.length) {
              el.insertBefore(document.createTextNode(text[i]), caret);
              i++;
              const ch = text[i - 1];
              const delay = /[.,?!—]/.test(ch) ? BASE * 5 : BASE + (Math.random() - 0.5) * 14;
              setTimeout(tick, delay);
            } else {
              caret.remove();
              if (onDone) onDone();
            }
          }
          tick();
        }

        const PROMPTS = [
          null,
          "What's your name?",
          null,
          "Give it a title.",
          "Here's your story.",
        ];
        const TITLE_SUGGESTIONS = [
          "How AI became my quiet collaborator",
          "The hour I get back every day",
          "A new kind of thinking partner",
          "Finding flow with a little help",
        ];
        let currentStep = 1;

        const STORY_HINTS = [
          'Think of a specific task you did today. What was it?',
          'What was the most time-consuming or draining part of it?',
          'What if an AI could handle that part automatically, every time?',
          'What if this tool was free and everyone in your field had it tomorrow?',
          'What if it could do your entire job? What would still need you?',
        ];
        let hintStep = 0;

        function showHint(n: number) {
          hintStep = n;
          const promptEl = document.getElementById('prompt-2');
          if (promptEl) typewriter(promptEl, STORY_HINTS[n]);
          setTimeout(() => (document.getElementById('field-body') as HTMLTextAreaElement)?.focus(), 280);
        }

        function showStep(n: number) {
          const formSteps = document.querySelectorAll('.form-step');
          const stepDots = document.querySelectorAll('.step-dot');
          formSteps.forEach(s => s.classList.remove('active'));
          const step = document.querySelector(`.form-step[data-step="${n}"]`);
          step?.classList.add('active');
          stepDots.forEach(d => (d as HTMLElement).classList.toggle('active', +(d as HTMLElement).dataset.step! === n));
          if (n === 2) {
            showHint(hintStep);
          } else {
            const promptEl = document.getElementById(`prompt-${n}`);
            if (PROMPTS[n] && promptEl) typewriter(promptEl, PROMPTS[n]!);
            const field = step?.querySelector('.form-field') as HTMLElement;
            if (field) setTimeout(() => field.focus(), 280);
          }
          currentStep = n;
        }

        function populatePreview() {
          const name = (document.getElementById('field-name') as HTMLInputElement)?.value.trim() ?? '';
          const body = (document.getElementById('field-body') as HTMLTextAreaElement)?.value.trim() ?? '';
          let title = (document.getElementById('field-title') as HTMLInputElement)?.value.trim() ?? '';
          if (!title) {
            const words = body.split(/\s+/).slice(0, 6).join(' ');
            title = words.split(/\s+/).length > 3
              ? words + (words.endsWith('.') ? '' : '…')
              : TITLE_SUGGESTIONS[Math.floor(Math.random() * TITLE_SUGGESTIONS.length)];
            const fieldTitle = document.getElementById('field-title') as HTMLInputElement;
            if (fieldTitle) fieldTitle.value = title;
          }
          const pt = document.getElementById('preview-title-display');
          const pb = document.getElementById('preview-body-display');
          const pa = document.getElementById('preview-author-display');
          if (pt) pt.textContent = title;
          if (pb) pb.textContent = body;
          if (pa) pa.textContent = `— ${name}`;
        }

        function flashBlob(idx: number) {
          const b = balls[idx];
          if (!b) return;
          const origR = b.baseR;
          b.baseR = origR * 1.65;
          let t = 0;
          const spring = setInterval(() => {
            t++;
            b.baseR = origR * (1.65 - 0.65 * (t / 22));
            if (t >= 22) { b.baseR = origR; clearInterval(spring); }
          }, 28);
        }

        let selectedStoryCategory = 'healthcare';
        let selectedStoryRisk: 'low' | 'medium' | 'high' = 'low';

        function spawnNewBall(title: string, body: string, name: string, category: string, risk: 'low' | 'medium' | 'high') {
          const newIdx = balls.length;
          const nb = new Ball(newIdx, balls.length + 1);
          nb.x = W * 0.5 + (Math.random() - 0.5) * 60;
          nb.y = H + 90;
          nb.color = COLORS[newIdx % COLORS.length];
          const angle = Math.random() * Math.PI * 2;
          nb.tx = W * 0.5 + Math.cos(angle) * Math.min(W, H) * 0.28;
          nb.ty = H * 0.5 + Math.sin(angle) * Math.min(W, H) * 0.28;
          nb.vx = 0; nb.vy = -2.5;
          balls.push(nb);
          stories.push({ title, body: body + '\n\n— ' + name, isPlaceholder: false, category, risk });
          if (mode === 'grid') {
            mode = 'transitioning';
            setTimeout(() => { mode = 'grid'; }, 2200);
          }
        }

        function openOverlay() {
          const fieldName = document.getElementById('field-name') as HTMLInputElement;
          const fieldBody = document.getElementById('field-body') as HTMLTextAreaElement;
          const fieldTitle = document.getElementById('field-title') as HTMLInputElement;
          const overlay = document.getElementById('story-form-overlay');
          if (fieldName) fieldName.value = '';
          if (fieldBody) fieldBody.value = '';
          if (fieldTitle) fieldTitle.value = '';
          hintStep = 0;
          selectedStoryCategory = 'healthcare';
          selectedStoryRisk = 'low';
          document.querySelectorAll('#form-category-row .form-tag-btn').forEach(btn => {
            (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.cat === 'healthcare');
          });
          document.querySelectorAll('#form-risk-row .form-tag-btn').forEach(btn => {
            (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.riskLevel === 'low');
          });
          overlay?.classList.add('open');
          showStep(1);
        }

        function closeOverlay() {
          const overlay = document.getElementById('story-form-overlay');
          overlay?.classList.remove('open');
        }

        function reinitBalls(count: number) {
          p.frameRate(count <= 60 ? 60 : count <= 100 ? 45 : 30);
          const r = computeBaseR(count);
          balls = Array.from({ length: count }, (_, i) => {
            const b = new Ball(i, count);
            b.baseR = r;
            b.r = r;
            return b;
          });
          const warmupPasses = count <= 60 ? 3 : count <= 120 ? 2 : 1;
          for (let i = 0; i < 500; i++) {
            balls.forEach(b => b.tick(i * 0.001, -9999, -9999));
            for (let s = 0; s < warmupPasses; s++) resolveAll();
          }
          stories = buildStories(count);
          setBallTargetColors(VIEWS[currentViewRef.current].category);
          if (mode !== 'freeform') {
            const cat = VIEWS[currentViewRef.current].category;
            const targets = cat === 'all'
              ? computeGridPositions(balls.length)
              : cat === 'testing'
              ? computeTestingPositions()
              : cat === 'testing2' || cat === 'testing3'
              ? computeTesting2Positions()
              : computeWorkSectorPositions();
            balls.forEach((b, i) => { if (targets[i]) { b.tx = targets[i].x; b.ty = targets[i].y; } });
            mode = 'transitioning';
          }
        }

        p.setup = () => {
          W = window.innerWidth; H = window.innerHeight;
          p.createCanvas(W, H);
          const initCount = dotCountRef.current;
          p.frameRate(initCount <= 60 ? 60 : initCount <= 100 ? 45 : 30);
          p.background(PR, PG, PB);
          balls = Array.from({ length: initCount }, (_, i) => new Ball(i, initCount));
          const warmupPasses = initCount <= 60 ? 3 : initCount <= 120 ? 2 : 1;
          for (let i = 0; i < 500; i++) {
            balls.forEach(b => b.tick(i * 0.001, -9999, -9999));
            for (let s = 0; s < warmupPasses; s++) resolveAll();
          }

          document.getElementById('view-prev')?.addEventListener('click', () => {
            setView((localViewIdx - 1 + VIEWS.length) % VIEWS.length);
          });
          document.getElementById('view-next')?.addEventListener('click', () => {
            setView((localViewIdx + 1) % VIEWS.length);
          });

          (['healthcare', 'government', 'education'] as const).forEach(cat => {
            document.getElementById(`label-${cat}`)?.addEventListener('click', () => {
              const cc = VIEWS[currentViewRef.current].category;
              if ((cc === 'worksector' || cc === 'testing' || cc === 'testing2' || cc === 'testing3') && zoomedSector === null) {
                enterZoom(cat);
              }
            });
          });

          document.querySelectorAll('.risk-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const risk = (btn as HTMLElement).dataset.risk as 'all' | 'low' | 'medium' | 'high';
              activeRiskRef.current = risk;
              document.querySelectorAll('.risk-btn').forEach(b => {
                (b as HTMLElement).classList.toggle('active', b === btn);
              });
            });
          });

          document.getElementById('story-close')?.addEventListener('click', () => {
            document.getElementById('story-panel')?.classList.remove('open');
          });
          document.getElementById('story-panel')?.addEventListener('click', e => {
            if (e.target === document.getElementById('story-panel'))
              document.getElementById('story-panel')?.classList.remove('open');
          });

          document.querySelectorAll('.next-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              if (currentStep === 1 && !(document.getElementById('field-name') as HTMLInputElement)?.value.trim()) {
                (document.getElementById('field-name') as HTMLInputElement)?.focus(); return;
              }
              if (currentStep === 2) {
                if (hintStep < STORY_HINTS.length - 1) {
                  showHint(hintStep + 1);
                  return;
                }
                if (!(document.getElementById('field-body') as HTMLTextAreaElement)?.value.trim()) {
                  (document.getElementById('field-body') as HTMLTextAreaElement)?.focus(); return;
                }
              }
              const next = +(btn as HTMLElement).dataset.next!;
              if (next === 4) populatePreview();
              showStep(next);
            });
          });

          document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const back = +(btn as HTMLElement).dataset.back!;
              if (currentStep === 2 && hintStep > 0) {
                showHint(hintStep - 1);
                return;
              }
              if (back === 2) hintStep = STORY_HINTS.length - 1;
              showStep(back);
            });
          });

          ['field-name', 'field-title'].forEach(id => {
            document.getElementById(id)?.addEventListener('keydown', (e: Event) => {
              if ((e as KeyboardEvent).key === 'Enter')
                (document.querySelector('.form-step.active .next-btn') as HTMLElement)?.click();
            });
          });

          document.getElementById('submit-story-btn')?.addEventListener('click', () => {
            const submitBtn = document.getElementById('submit-story-btn')!;
            const name = (document.getElementById('field-name') as HTMLInputElement)?.value.trim() ?? '';
            const body = (document.getElementById('field-body') as HTMLTextAreaElement)?.value.trim() ?? '';
            const title = (document.getElementById('field-title') as HTMLInputElement)?.value.trim()
              || (document.getElementById('preview-title-display')?.textContent ?? '');
            const slotIndex = stories.findIndex(s => s.isPlaceholder);
            if (slotIndex !== -1) {
              stories[slotIndex] = { title, body: body + '\n\n— ' + name, isPlaceholder: false, category: selectedStoryCategory, risk: selectedStoryRisk };
              flashBlob(slotIndex);
            } else {
              spawnNewBall(title, body, name, selectedStoryCategory, selectedStoryRisk);
            }
            submitBtn.classList.add('submitting');
            submitBtn.textContent = 'Finding its place…';
            setTimeout(() => {
              submitBtn.classList.remove('submitting');
              submitBtn.textContent = 'Add to canvas';
              closeOverlay();
            }, 1900);
          });

          document.querySelectorAll('#form-category-row .form-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              selectedStoryCategory = (btn as HTMLElement).dataset.cat!;
              document.querySelectorAll('#form-category-row .form-tag-btn').forEach(b => {
                (b as HTMLElement).classList.toggle('active', b === btn);
              });
            });
          });

          document.querySelectorAll('#form-risk-row .form-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              selectedStoryRisk = (btn as HTMLElement).dataset.riskLevel as 'low' | 'medium' | 'high';
              document.querySelectorAll('#form-risk-row .form-tag-btn').forEach(b => {
                (b as HTMLElement).classList.toggle('active', b === btn);
              });
            });
          });

          document.getElementById('share-btn')?.addEventListener('click', openOverlay);
          document.getElementById('form-close')?.addEventListener('click', closeOverlay);
          document.getElementById('story-form-overlay')?.addEventListener('click', e => {
            if (e.target === document.getElementById('story-form-overlay')) closeOverlay();
          });
          document.addEventListener('keydown', e => {
            const overlay = document.getElementById('story-form-overlay');
            if (e.key === 'Escape' && overlay?.classList.contains('open')) closeOverlay();
          });

          document.getElementById('enter-btn')?.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (mode !== 'freeform') return;
            // Always land on Default View (grid) when entering
            localViewIdx = 0;
            currentViewRef.current = 0;
            const label = document.getElementById('view-label');
            if (label) label.textContent = VIEWS[0].label;
            mode = 'transitioning';
            const targets = computeGridPositions(balls.length);
            balls.forEach((b, i) => { b.tx = targets[i].x; b.ty = targets[i].y; });
            const enterBtn = document.getElementById('enter-btn')!;
            enterBtn.style.opacity = '0';
            enterBtn.style.pointerEvents = 'none';
            setTimeout(() => {
              const shareBtn = document.getElementById('share-btn')!;
              shareBtn.style.display = 'flex';
              const viewToggle = document.getElementById('view-toggle')!;
              viewToggle.style.display = 'flex';
              requestAnimationFrame(() => requestAnimationFrame(() => {
                shareBtn.classList.add('visible');
                viewToggle.classList.add('visible');
              }));
            }, 1600);
          });
        };

        p.windowResized = () => {
          W = window.innerWidth; H = window.innerHeight;
          p.resizeCanvas(W, H);
          p.background(PR, PG, PB);
        };

        p.draw = () => {
          // Sync dot count from React
          if (prevDotCount !== dotCountRef.current) {
            prevDotCount = dotCountRef.current;
            reinitBalls(dotCountRef.current);
          }

          // Sync spacing slider — recompute cluster positions live
          if (prevSpacing !== spacingRef.current && mode === 'grid' && zoomedSector === null) {
            prevSpacing = spacingRef.current;
            const cat = VIEWS[currentViewRef.current].category;
            if (cat === 'worksector' || cat === 'testing' || cat === 'testing2' || cat === 'testing3') {
              const targets = cat === 'testing' ? computeTestingPositions() : (cat === 'testing2' || cat === 'testing3') ? computeTesting2Positions() : computeWorkSectorPositions();
              balls.forEach((b, i) => { if (targets[i]) { b.tx = targets[i].x; b.ty = targets[i].y; } });
              mode = 'transitioning';
            }
          }

          (p.blendMode as (m: unknown) => void)(p.BLEND);
          p.noStroke();
          (p as unknown as { fill: (...args: number[]) => void }).fill(PR, PG, PB, 6);
          p.rect(0, 0, W, H);

          if (mode === 'freeform') {
            simT += 0.001;
            balls.forEach(b => b.tick(simT, mouse.x, mouse.y));
            const passes = dotCountRef.current <= 60 ? 3 : dotCountRef.current <= 120 ? 2 : 1;
            for (let s = 0; s < passes; s++) resolveAll();
          } else if (mode === 'grid' && (VIEWS[currentViewRef.current].category === 'testing2' || VIEWS[currentViewRef.current].category === 'testing3') && zoomedSector === null) {
            bobT += 0.014;
            balls.forEach(b => {
              const amp = b.baseR * 0.22;
              const tx = b.tx + Math.cos(bobT * 0.55 + b.phase) * amp * 0.35;
              const ty = b.ty + Math.sin(bobT + b.phase) * amp;
              b.x += (tx - b.x) * 0.05;
              b.y += (ty - b.y) * 0.05;
              b.vx = 0; b.vy = 0;
            });
          } else {
            let settled = true;
            balls.forEach(b => {
              const dx = b.tx - b.x, dy = b.ty - b.y;
              b.x += dx * 0.05; b.y += dy * 0.05;
              b.vx = 0; b.vy = 0;
              if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) settled = false;
            });
            if (mode === 'transitioning' && settled) {
              mode = 'grid';
              document.body.classList.add('grid-mode');
            }
          }

          (p.blendMode as (m: unknown) => void)(p.MULTIPLY);
          const curCat = VIEWS[currentViewRef.current].category;
          const inClusterView = curCat === 'worksector' || curCat === 'testing' || curCat === 'testing2' || curCat === 'testing3';
          balls.forEach((b, i) => {
            // Lerp color toward target
            b.color[0] += (b.targetColor[0] - b.color[0]) * 0.04;
            b.color[1] += (b.targetColor[1] - b.color[1]) * 0.04;
            b.color[2] += (b.targetColor[2] - b.color[2]) * 0.04;
            // Scale: 1.2× when zoomed into this sector, 1.1× on cluster hover, 0.65× in testing rings, else 1
            const isHoveredCluster = inClusterView && zoomedSector === null && hoveredCluster !== null && stories[i]?.category === hoveredCluster;
            const scaleTarget = zoomedSector !== null && stories[i]?.category === zoomedSector ? 1.2
              : isHoveredCluster ? 1.1
              : curCat === 'testing' && zoomedSector === null ? 0.65
              : (curCat === 'worksector' || curCat === 'testing2' || curCat === 'testing3') && zoomedSector === null ? 0.82
              : 1;
            b.displayScale += (scaleTarget - b.displayScale) * 0.08;
            const alphaTarget = zoomedSector !== null && activeRiskRef.current !== 'all' && stories[i]?.risk !== activeRiskRef.current ? 0.15 : 2;
            b.displayAlpha += (alphaTarget - b.displayAlpha) * 0.07;
            const savedR = b.r;
            b.r *= b.displayScale;
            renderWatercolour(b, dotCountRef.current);
            b.r = savedR;
          });
        };

        document.addEventListener('mousemove', e => {
          mouse.x = e.clientX; mouse.y = e.clientY;
          if (cursorEl) { cursorEl.style.left = e.clientX + 'px'; cursorEl.style.top = e.clientY + 'px'; }

          const inWorksectorGrid = mode === 'grid' && (VIEWS[currentViewRef.current].category === 'worksector' || VIEWS[currentViewRef.current].category === 'testing' || VIEWS[currentViewRef.current].category === 'testing2' || VIEWS[currentViewRef.current].category === 'testing3') && zoomedSector === null;

          if (inWorksectorGrid) {
            // Detect cluster hover
            let found: string | null = null;
            for (const cat of ['healthcare', 'government', 'education']) {
              const info = sectorInfo[cat];
              if (info && Math.hypot(e.clientX - info.cx, e.clientY - info.cy) < info.r) {
                found = cat; break;
              }
            }
            hoveredCluster = found;
            // Suppress individual orb tooltip in cluster hover mode
            if (hoveredBlob !== -1) {
              hoveredBlob = -1;
              document.getElementById('blob-tooltip')?.classList.remove('visible');
            }
          } else if (mode === 'grid') {
            hoveredCluster = null;
            const hit = balls.findIndex(b => Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.r);
            if (hit !== hoveredBlob) {
              hoveredBlob = hit;
              const blobTooltip = document.getElementById('blob-tooltip');
              const tipTitle = document.getElementById('tip-title');
              if (hit !== -1) {
                const s = stories[hit];
                if (tipTitle) tipTitle.textContent = s.title;
                blobTooltip?.classList.add('visible');
              } else {
                blobTooltip?.classList.remove('visible');
              }
            }
            if (hit !== -1) {
              const blobTooltip = document.getElementById('blob-tooltip')!;
              blobTooltip.style.left = Math.min(e.clientX + 14, W - 220) + 'px';
              blobTooltip.style.top = Math.max(e.clientY - 80, 8) + 'px';
            }
          } else {
            hoveredCluster = null;
            if (hoveredBlob !== -1) {
              hoveredBlob = -1;
              document.getElementById('blob-tooltip')?.classList.remove('visible');
            }
          }
        });

        document.addEventListener('mousedown', () => cursorEl?.classList.add('big'));
        document.addEventListener('mouseup', () => cursorEl?.classList.remove('big'));

        document.addEventListener('click', e => {
          const overlay = document.getElementById('story-form-overlay');
          if (overlay?.classList.contains('open')) return;
          if (mode === 'freeform') {
            scatter(e.clientX, e.clientY);
          } else if (mode === 'grid') {
            const inWorksectorGrid = (VIEWS[currentViewRef.current].category === 'worksector' || VIEWS[currentViewRef.current].category === 'testing' || VIEWS[currentViewRef.current].category === 'testing2') && zoomedSector === null;
            if (inWorksectorGrid) {
              // Click on a cluster → zoom in
              for (const cat of ['healthcare', 'government', 'education']) {
                const info = sectorInfo[cat];
                if (info && Math.hypot(e.clientX - info.cx, e.clientY - info.cy) < info.r) {
                  enterZoom(cat);
                  return;
                }
              }
            } else {
              const hit = balls.findIndex(b => Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.r * b.displayScale);
              if (hit !== -1) {
                openStory(hit);
              } else if (zoomedSector !== null) {
                // Click on empty space while zoomed → exit back to cluster view
                exitZoom();
              }
            }
          }
        });

        document.addEventListener('touchmove', e => {
          const t = e.touches[0]; mouse.x = t.clientX; mouse.y = t.clientY;
        }, { passive: true });

        document.addEventListener('touchstart', e => {
          const t = e.touches[0];
          if (mode === 'freeform') scatter(t.clientX, t.clientY);
        }, { passive: true });
      }, containerRef.current);
    });

    return () => {
      p5Instance?.remove();
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />;
}
