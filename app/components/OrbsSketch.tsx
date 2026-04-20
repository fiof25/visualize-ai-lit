'use client';

import { useEffect, useRef } from 'react';

export default function OrbsSketch() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let p5Instance: InstanceType<typeof import('p5')> | null = null;

    import('p5').then(({ default: P5 }) => {
      if (!containerRef.current) return;

      p5Instance = new P5((p: InstanceType<typeof P5>) => {
        const PR = 242, PG = 237, PB = 225;
        const COLORS = [
          [190, 118, 98],
          [108, 135, 178],
          [198, 162, 95],
          [100, 148, 120],
          [195, 148, 175],
        ] as [number, number, number][];

        const cursorEl = document.getElementById('cursor');
        let W: number, H: number;
        const mouse = { x: -9999, y: -9999 };
        let balls: Ball[] = [];
        let simT = 0;
        let mode: 'freeform' | 'transitioning' | 'grid' = 'freeform';
        let hoveredBlob = -1;

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
          phase: number; wobble: number; pulseT: number;
          baseR: number; r: number;
          tx = 0; ty = 0;

          constructor(i: number) {
            const ang = (i / 50) * Math.PI * 2 + Math.random() * 0.9;
            const spread = 0.18 + Math.random() * 0.62;
            this.x = W * 0.5 + Math.cos(ang) * W * spread;
            this.y = H * 0.5 + Math.sin(ang) * H * spread * 0.75;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.color = COLORS[i % COLORS.length];
            this.phase = Math.random() * Math.PI * 2;
            this.wobble = 0.35 + Math.random() * 0.9;
            this.pulseT = Math.random() * Math.PI * 2;
            this.baseR = 48;
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
            if (this.x < pad)     this.vx += (pad - this.x) * 0.06;
            if (this.x > W - pad) this.vx -= (this.x - (W - pad)) * 0.06;
            if (this.y < pad)     this.vy += (pad - this.y) * 0.06;
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

        function renderWatercolour(ball: Ball) {
          const [rv, gv, bv] = ball.color;
          const numLayers = 16, layerAlpha = 2;
          (p as unknown as { fill: (...args: number[]) => void }).fill(rv, gv, bv, layerAlpha);
          p.noStroke();
          const n = 8;
          const verts = Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2;
            return { x: ball.x + Math.cos(a) * ball.r, y: ball.y + Math.sin(a) * ball.r };
          });
          const mods = Array.from({ length: n }, () => p.random(0.32, 0.90));
          let poly = growPoly(growPoly({ verts, mods }));
          for (let i = 0; i < numLayers; i++) {
            if (i === Math.floor(numLayers / 2)) poly = growPoly(poly);
            drawPoly(growPoly(poly));
          }
        }

        function computeGridPositions() {
          const cols = 9, rows = 5;
          const padX = W * 0.10, padY = H * 0.15;
          const positions: { x: number; y: number }[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              positions.push({
                x: padX + (c / (cols - 1)) * (W - padX * 2),
                y: padY + (r / (rows - 1)) * (H - padY * 2),
              });
            }
          }
          return positions;
        }

        const stories = Array.from({ length: 45 }, (_, i) => ({
          title: `Story ${i + 1}`,
          body: 'This story is coming soon.',
          isPlaceholder: true,
        }));

        function openStory(i: number) {
          const storyTitle = document.getElementById('story-title');
          const storyBody = document.getElementById('story-body');
          const storyPanel = document.getElementById('story-panel');
          if (storyTitle) storyTitle.textContent = stories[i].title;
          if (storyBody) storyBody.textContent = stories[i].body;
          storyPanel?.classList.add('open');
        }

        function typewriter(el: HTMLElement, text: string, onDone?: () => void) {
          el.innerHTML = '';
          const caret = document.createElement('span');
          caret.className = 'caret';
          el.appendChild(caret);
          let i = 0;
          const BASE = 36;
          function tick() {
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
          "How do you use AI? Tell me about your experience.",
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

        function showStep(n: number) {
          const formSteps = document.querySelectorAll('.form-step');
          const stepDots = document.querySelectorAll('.step-dot');
          formSteps.forEach(s => s.classList.remove('active'));
          const step = document.querySelector(`.form-step[data-step="${n}"]`);
          step?.classList.add('active');
          stepDots.forEach(d => (d as HTMLElement).classList.toggle('active', +(d as HTMLElement).dataset.step! === n));
          const promptEl = document.getElementById(`prompt-${n}`);
          if (PROMPTS[n] && promptEl) typewriter(promptEl, PROMPTS[n]!);
          const field = step?.querySelector('.form-field') as HTMLElement;
          if (field) setTimeout(() => field.focus(), 280);
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

        function spawnNewBall(title: string, body: string, name: string) {
          const newIdx = balls.length;
          const nb = new Ball(newIdx);
          nb.x = W * 0.5 + (Math.random() - 0.5) * 60;
          nb.y = H + 90;
          nb.color = COLORS[newIdx % COLORS.length];
          const angle = Math.random() * Math.PI * 2;
          nb.tx = W * 0.5 + Math.cos(angle) * Math.min(W, H) * 0.28;
          nb.ty = H * 0.5 + Math.sin(angle) * Math.min(W, H) * 0.28;
          nb.vx = 0; nb.vy = -2.5;
          balls.push(nb);
          stories.push({ title, body: body + '\n\n— ' + name, isPlaceholder: false });
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
          p.noLoop();
          overlay?.classList.add('open');
          showStep(1);
        }

        function closeOverlay() {
          const overlay = document.getElementById('story-form-overlay');
          overlay?.classList.remove('open');
          setTimeout(() => { p.loop(); }, 420);
        }

        p.setup = () => {
          W = window.innerWidth; H = window.innerHeight;
          p.createCanvas(W, H);
          p.background(PR, PG, PB);
          balls = Array.from({ length: 45 }, (_, i) => new Ball(i));
          for (let i = 0; i < 500; i++) {
            balls.forEach(b => b.tick(i * 0.001, -9999, -9999));
            for (let s = 0; s < 3; s++) resolveAll();
          }

          // Wire up DOM events after setup
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
              if (currentStep === 2 && !(document.getElementById('field-body') as HTMLTextAreaElement)?.value.trim()) {
                (document.getElementById('field-body') as HTMLTextAreaElement)?.focus(); return;
              }
              const next = +(btn as HTMLElement).dataset.next!;
              if (next === 4) populatePreview();
              showStep(next);
            });
          });

          document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => showStep(+(btn as HTMLElement).dataset.back!));
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
              stories[slotIndex] = { title, body: body + '\n\n— ' + name, isPlaceholder: false };
              flashBlob(slotIndex);
            } else {
              spawnNewBall(title, body, name);
            }
            submitBtn.classList.add('submitting');
            submitBtn.textContent = 'Finding its place…';
            setTimeout(() => {
              submitBtn.classList.remove('submitting');
              submitBtn.textContent = 'Add to canvas';
              closeOverlay();
            }, 1900);
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
            mode = 'transitioning';
            const targets = computeGridPositions();
            balls.forEach((b, i) => { b.tx = targets[i].x; b.ty = targets[i].y; });
            const enterBtn = document.getElementById('enter-btn')!;
            enterBtn.style.opacity = '0';
            enterBtn.style.pointerEvents = 'none';
            setTimeout(() => {
              const shareBtn = document.getElementById('share-btn')!;
              shareBtn.style.display = 'flex';
              requestAnimationFrame(() => requestAnimationFrame(() => shareBtn.classList.add('visible')));
            }, 1600);
          });
        };

        p.windowResized = () => {
          W = window.innerWidth; H = window.innerHeight;
          p.resizeCanvas(W, H);
          p.background(PR, PG, PB);
        };

        p.draw = () => {
          (p.blendMode as (m: unknown) => void)(p.BLEND);
          p.noStroke();
          (p as unknown as { fill: (...args: number[]) => void }).fill(PR, PG, PB, 6);
          p.rect(0, 0, W, H);

          if (mode === 'freeform') {
            simT += 0.001;
            balls.forEach(b => b.tick(simT, mouse.x, mouse.y));
            for (let s = 0; s < 3; s++) resolveAll();
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
          balls.forEach(b => renderWatercolour(b));
        };

        document.addEventListener('mousemove', e => {
          mouse.x = e.clientX; mouse.y = e.clientY;
          if (cursorEl) { cursorEl.style.left = e.clientX + 'px'; cursorEl.style.top = e.clientY + 'px'; }

          if (mode === 'grid') {
            const hit = balls.findIndex(b => Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.r);
            if (hit !== hoveredBlob) {
              hoveredBlob = hit;
              const blobTooltip = document.getElementById('blob-tooltip');
              const tipTitle = document.getElementById('tip-title');
              if (hit !== -1) {
                if (tipTitle) tipTitle.textContent = stories[hit].title;
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
            const hit = balls.findIndex(b => Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.r);
            if (hit !== -1) openStory(hit);
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
