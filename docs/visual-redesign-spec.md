# Worm Ranch Visual Dynamics Redesign Specification
**Target Demographic:** Ages 14-25 (Gen Z)  
**Design Reference Year:** 2025  
**Status:** CRITICAL REDESIGN — Implementation Ready

---

## Executive Summary

Current Worm Ranch has a competent dark-mode canvas game aesthetic but lacks the **visual language, motion feedback, and cultural resonance** that defines 2025 Gen Z gaming preferences. This spec defines a complete visual overhaul targeting eight key trend pillars identified from industry research.

---

## Trend Pillars & Current Gaps

| # | 2025 Trend Pillar | Source | Current State | Gap |
|---|-------------------|--------|---------------|-----|
| 1 | **Retro Futurism / Retro Pixels** | SVGator #4, #10 | Missing | 🔴 |
| 2 | **Dark Mode + Neon Accents** | SVGator #9, Gen Z #2, #10 | Partial (muted) | 🔴 |
| 3 | **Motion as Feedback** | Pixelmatters #3, Mobile Game UI | Decorative only | 🔴 |
| 4 | **Minimalist Maximalism** | SVGator #6 | Clean but flat | 🟠 |
| 5 | **Gesture-First Controls** | Mobile Game UI #1 | Tap/keyboard only | 🟠 |
| 6 | **Adaptive/Dynamic UI** | Mobile Game UI #2 | Static toggle only | 🟠 |
| 7 | **Expressive Typography** | Pixelmatters #1 | System fonts | 🟠 |
| 8 | **Micro-Interactions System** | Pixelmatters #1, Mobile Game UI | Ad-hoc | 🟡 |

---

## 1. Color System — Neon-on-Deep-Dark

### Token Definitions
```css
:root {
  /* Base */
  --bg-deep:       #050a0f;        /* Canvas/base */
  --bg-elevated:   #0a121a;        /* Cards, panels */
  --bg-glass:      rgba(10, 18, 26, 0.72);
  --glass-border:  rgba(199, 243, 107, 0.18);
  
  /* Neon Accents — TRUE NEON VALUES */
  --neon-lime:     #c7f36b;        /* Primary: collect, success, blink */
  --neon-cyan:     #00f5ff;        /* Teleport, blink charge, UI focus */
  --neon-orange:   #f07e43;        /* Ghost finale, warning, rush */
  --neon-pink:     #ff3366;        /* Outlaw, critical, game over */
  --neon-purple:   #bc9fff;        /* Fairy, magic, morph, special */
  --neon-amber:    #ffd44a;        /* Tag progress, countdown */
  
  /* Text */
  --text:          #f5f4e9;        /* Primary */
  --text-dim:      #9aa3ac;        /* Secondary */
  --text-mono:     #c7f36b;        /* Mono labels in accent */
  
  /* Semantic */
  --success:       var(--neon-lime);
  --warning:       var(--neon-amber);
  --danger:        var(--neon-pink);
  --info:          var(--neon-cyan);
  --magic:         var(--neon-purple);
}
```

### Usage Mapping
| Game Element | Color | Rationale |
|--------------|-------|-----------|
| Worm collect ("BAGGED") | `--neon-lime` | Primary success |
| Blink charge/teleport | `--neon-cyan` | "Electric" magic |
| Tag progress | `--neon-amber` | Warning/buildup |
| Ghost finale/outlaw | `--neon-pink` | Danger/critical |
| Fairy/morph | `--neon-purple` | Supernatural |
| Countdown numbers | `--neon-cyan` | Urgency |
| UI focus/selection | `--neon-cyan` | Interaction highlight |

---

## 2. Retro-Futurist Render Layer

### CRT/Scanline Shader (Default ON, Desktop)
```glsl
// Applied as final pass in renderStage()
uniform sampler2D u_scene;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 color = texture2D(u_scene, uv);
  
  // Subtle scanlines (2px every 4px)
  float scan = sin(uv.y * u_resolution.y * 1.57) * 0.03;
  color.rgb -= scan;
  
  // Vignette
  float vig = 1.0 - length(uv - 0.5) * 0.6;
  color.rgb *= vig;
  
  // Chromatic aberration on edges (subtle)
  vec2 offset = (uv - 0.5) * 0.0015;
  color.r = texture2D(u_scene, uv + offset).r;
  color.b = texture2D(u_scene, uv - offset).b;
  
  gl_FragColor = color;
}
```

**Canvas 2D Fallback** (for non-WebGL contexts):
```typescript
function drawRetroOverlay(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000';
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 2);
  // Vignette
  const vig = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h));
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
```

---

## 3. Motion-as-Feedback System

### Core Principle
> **Every motion serves gameplay communication. Zero decorative animation.**

### Event-to-Motion Mapping

| Game Event | Motion Response | Duration | Easing |
|------------|-----------------|----------|--------|
| **Worm Collected** | Screen shake (4px, 60ms) + radial burst from worm pos + haptic (12ms) | 60ms | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` |
| **Blink Charged** | Worm strobe (3Hz, neon cyan) + time-dilation (0.7x, 150ms) + UI pill glow | 150ms | — |
| **Tag Progress** | Pulse ring expands + amber glow on target pill | 200ms/loop | `cubic-bezier(0.25, 1, 0.5, 1)` |
| **Ghost Finale Enter** | Full-screen chromatic aberration sweep (200ms) + scanline glitch (3 frames) + audio pitch -0.5st | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| **Round Start Countdown** | Numbers slam in (elastic scale 1.4→1.0) + bass hit per number | 350ms/num | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` |
| **Phase Transition** | Cross-fade with directional sweep (match phase color) | 400ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| **Miss/Failed Tap** | Horizontal shake (6px, 3-cycle) + red flash on pointer ring | 280ms | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` |
| **Fairy Morph** | Purple particle spiral + 0.8x slow-mo (200ms) | 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

### Implementation Locations
- `gameStageMotion.ts` — core motion cues
- `gameStageCanvas.ts` — canvas-level effects (shake, chromatic aberration)
- `gameStagePresentation.ts` — overlay/UI motion
- New: `gameStageParticles.ts` — particle bursts

---

## 4. Typography — Expressive Display System

### Font Selection
**Recommended (OFL, variable, distinctive):**
1. **Space Grotesk** — Geometric, sharp terminals, 9 weights
2. **Syne** — High contrast, 5 weights + italic, very distinctive
3. **Outfit** — Geometric, 9 weights, clean but characterful
4. **Plus Jakarta Sans** — Humanist, 9 weights, friendly authority

**Selection Criteria:** Variable font (single file), sharp terminals for "ranch" feel, excellent legibility at small sizes, distinct from system UI fonts.

### Token Integration
```css
/* Global or WormRanchApp.module.css */
@font-face {
  font-family: 'WormRanch Display';
  src: url('/fonts/WormRanchDisplay-Variable.woff2') format('woff2-variations');
  font-weight: 200 900;
  font-display: swap;
}

@font-face {
  font-family: 'WormRanch Mono';
  src: url('/fonts/WormRanchMono-Variable.woff2') format('woff2-variations');
  font-weight: 300 700;
  font-display: swap;
}

/* Application */
.kicker, .eyebrow, .phaseBadge, .statusLabel, .tallyLabel {
  font-family: 'WormRanch Mono', var(--font-mono);
  font-variation-settings: 'wght' 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title, .titleLarge, h1, h2 {
  font-family: 'WormRanch Display';
  font-variation-settings: 'wght' 800;
  line-height: 0.96;
  text-wrap: balance;
}

.body, .message, .note {
  font-family: var(--font-sans);
  font-variation-settings: 'wght' 400;
  line-height: 1.45;
}
```

---

## 5. Adaptive HUD — Context-Aware Density

### Density Modes
| Mode | Trigger | Visible Elements | Hidden Elements |
|------|---------|------------------|-----------------|
| `standard` | Default gameplay | All HUD | — |
| `compact` | Mobile + (high intensity OR low health) | Status pills (minimal), target callout | Phase badge, copy cluster, hint |
| `focused` | **NEW** — BlinkBand or GhostFinale phase | Target callout (dimmed), critical timer only | All status, phase badge, copy, hint |
| `cinematic` | Round end, results | Tally strip, outcome, actions | Game HUD |

### CSS Implementation
```css
/* Focused mode — maximum immersion */
.shell[data-overlay-density="focused"] .statusStrip { display: none; }
.shell[data-overlay-density="focused"] .phaseBadge { display: none; }
.shell[data-overlay-density="focused"] .copyCluster { display: none; }
.shell[data-overlay-density="focused"] .hint { display: none; }
.shell[data-overlay-density="focused"] .targetCallout { 
  opacity: 0.5; 
  scale: 0.88; 
  pointer-events: none;
}

/* Cinematic mode — results focus */
.shell[data-overlay-density="cinematic"] .statusStrip,
.shell[data-overlay-density="cinematic"] .targetCallout,
.shell[data-overlay-density="cinematic"] .phaseBadge { display: none; }
```

---

## 6. Gesture-First Mobile Controls

### Interaction Model
| Gesture | Action | Feedback |
|---------|--------|----------|
| **Swipe L/R** | Cycle target (next/previous worm) | Haptic (8ms) per swipe + target highlight pulse |
| **Tap** | Act on current target (collect/tag/teleport) | Standard press micro-interaction |
| **Long Press (300ms+)** | Trigger touch rush / burst | Haptic ramp (8→24ms) + visual charge ring |
| **Pinch** | Zoom canvas (accessibility) | Smooth scale, no haptic |
| **Two-finger Tap** | Pause/menu | Standard |

### Implementation Notes
- Replace `gameStageKeyboard.ts` logic for mobile profile
- Use `navigator.vibrate()` for haptic (progressive enhancement)
- Maintain keyboard/pointer support for desktop/accessibility
- Test with `prefers-reduced-motion` — disable haptic if set

---

## 7. Micro-Interaction Library (Unified)

### Core Primitives
```typescript
// lib/microInteractions.ts
export const micro = {
  press: (el, scale = 0.96) => el.animate({ transform: ['scale(1)', `scale(${scale})`, 'scale(1)'] }, { duration: 100, easing: 'cubic-bezier(0.22,1,0.36,1)' }),
  succeed: (el, color = 'var(--neon-lime)') => el.animate({ boxShadow: [`0 0 0 0 ${color}00`, `0 0 0 12px ${color}44`, `0 0 0 0 ${color}00`] }, { duration: 320, easing: 'cubic-bezier(0.25,1,0.5,1)' }),
  fail: (el) => el.animate({ transform: ['translateX(0)', 'translateX(-6px)', 'translateX(6px)', 'translateX(-4px)', 'translateX(0)'] }, { duration: 280, easing: 'cubic-bezier(0.68,-0.55,0.27,1.55)' }),
  transition: (el) => el.animate({ opacity: [0.6, 1], filter: ['blur(2px)', 'blur(0)'] }, { duration: 220, easing: 'cubic-bezier(0.16,1,0.3,1)' }),
  shimmer: (el) => { el.style.background = 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)'; el.style.backgroundSize = '200% 100%'; return el.animate({ backgroundPosition: ['200% 0', '-200% 0'] }, { duration: 1200, iterations: Infinity, easing: 'linear' }); },
  glowPulse: (el, color) => el.animate({ boxShadow: [`0 0 0 0 ${color}00`, `0 0 16px 4px ${color}66`, `0 0 0 0 ${color}00`] }, { duration: 1000, iterations: Infinity, easing: 'ease-in-out' }),
};
```

### Application Map
| Component | Interaction | Trigger |
|-----------|-------------|---------|
| Primary/Secondary buttons | `press()` + `succeed()` | click/tap |
| Status pills (active) | `glowPulse()` | phase active |
| Target callout | `transition()` | phase change |
| Tally items | `press()` | appear (staggered) |
| Canvas feedback labels | `succeed()` (lime/amber/pink) | collect/tag/outlaw |
| Install prompt | `shimmer()` | idle > 5s |
| Phase badge | `transition()` | phase change |

---

## 8. Particle Burst System

### Specification
```typescript
// gameStageParticles.ts
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; ttl: number;
  color: string; size: number;
}

const PARTICLE_PRESETS = {
  collect:    { color: 'var(--neon-lime)', count: 18, speed: 140, gravity: 180, ttl: [300, 500] },
  tag:        { color: 'var(--neon-amber)', count: 12, speed: 100, gravity: 120, ttl: [250, 400] },
  blink:      { color: 'var(--neon-cyan)', count: 24, speed: 180, gravity: 80, ttl: [400, 600] },
  outlaw:     { color: 'var(--neon-pink)', count: 30, speed: 200, gravity: 220, ttl: [500, 800] },
  fairy:      { color: 'var(--neon-purple)', count: 16, speed: 80, gravity: 40, ttl: [600, 1000] },
  rush:       { color: 'var(--neon-orange)', count: 14, speed: 160, gravity: 150, ttl: [300, 500] },
};
```

### Render Loop Integration
```typescript
// In renderStage() after drawWorm()
particles.forEach((p, i) => {
  p.life += delta;
  if (p.life >= p.ttl) { particles.splice(i, 1); return; }
  const t = p.life / p.ttl;
  const alpha = (1 - t) * 0.9;
  const sz = p.size * (1 - t * 0.5);
  ctx.fillStyle = p.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
  p.x += p.vx * delta / 1000;
  p.y += p.vy * delta / 1000;
  p.vy += p.gravity * delta / 1000;
});
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Define CSS custom property color system in `:root`
- [ ] Update all component CSS modules to use new tokens
- [ ] Add `@font-face` for display + mono variable fonts
- [ ] Create `lib/microInteractions.ts` library
- [ ] Apply micro-interactions to all buttons, pills, badges

### Phase 2: Motion & Feedback (Week 1-2)
- [ ] Implement screen shake in `gameStageCanvas.ts`
- [ ] Add chromatic aberration shader pass
- [ ] Map `motionCue` values to physical feedback (not just color)
- [ ] Implement particle burst system
- [ ] Add haptic integration for mobile

### Phase 3: Adaptive Systems (Week 2)
- [ ] Implement `focused` and `cinematic` density modes
- [ ] Build gesture-first mobile controls
- [ ] Add adaptive density logic based on phase/health/profile
- [ ] Test reduced-motion compliance on all new motion

### Phase 4: Polish (Week 2-3)
- [ ] CRT/scanline overlay (toggle in settings)
- [ ] Vignette + subtle chromatic aberration
- [ ] Countdown number "slam" animation
- [ ] Cross-browser testing (Safari iOS critical)
- [ ] Performance audit (target 60fps on 5-year-old phones)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Visual distinctiveness** | >80% recognition in 5s exposure | User testing |
| **Motion clarity** | 100% of testers identify game state from motion alone | A/B test |
| **Mobile gesture adoption** | >60% sessions use swipe vs tap | Analytics |
| **Frame rate** | 60fps sustained on iPhone 12 / Android mid-tier | Lighthouse/CI |
| **Reduced motion compliance** | Zero motion when `prefers-reduced-motion: reduce` | Automated test |
| **Load time** | <2s interactive on 3G | WebPageTest |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance regression on low-end | Quality presets: `high` (all effects) / `medium` (no particles, no CRT) / `low` (no motion, no CRT) |
| Accessibility failures | `prefers-reduced-motion` disables ALL non-essential motion; haptic optional; high contrast mode |
| Font loading flash | `font-display: swap` + system font fallback matching x-height |
| Gesture conflicts (scroll/zoom) | `touch-action: manipulation` on canvas; passive listeners where possible |
| Color blindness | Neon palette tested with Coblis simulator; semantic color + shape/icons redundant |

---

## Appendix: Design References

- **SVGator 2025 Trends** — Motion graphics, Retro futurism, Dark mode neon, Retro pixels
- **Gen Z Design Preferences (Greater Manchester)** — Bold colors, Dark mode, Authenticity, Interactivity
- **Mobile Game UI 2025 (LinkedIn Pulse)** — Minimal UI, Gesture controls, Adaptive UI, Glassmorphism
- **Pixelmatters 2025 UI Trends** — Beyond flat, Post-neumorphism, Motion as feedback, Dark mode default
- **Discord 2025 Brand Refresh** — Expressive typography, strategic color pops
- **Shopify Polaris Depth** — Purposeful shadows, tactile depth
- **Apple Spatial Design** — Glassmorphism, layered depth