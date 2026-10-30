# EvidenceCheck AI — Design Research & Art Direction

## 1. Inspection Audit of Reference Websites

During the design discovery phase, 6 leading interactive and design benchmark websites were inspected. Direct programmatic inspection was executed to verify accessibility and extract design engineering patterns.

| Website | HTTP Status | Technical Architecture & Observed Patterns |
| :--- | :--- | :--- |
| **Bruno Simon** (`https://bruno-simon.com/`) | **200 OK** | Fullscreen WebGL canvas rendered via Three.js with rigid-body physics. Demonstrates that 3D can create immense delight, but also highlights high GPU overhead (~58 KB HTML entry loading heavy WebGL bundles) and lack of content scanability for critical forensic text. |
| **Linear** (`https://linear.app/`) | **200 OK** | The pinnacle of modern dark-mode SaaS. Deep charcoal/slate backgrounds (`#08090A`), ultra-subtle border contrasts (`rgba(255,255,255,0.08)`), high typography hierarchy, crisp micro-badges, canvas-driven light rays, and rapid keyboard-centric workflows. |
| **Spline** (`https://spline.design/`) | **200 OK** | Interactive 3D objects with camera track mouse-look, glow shaders, glassmorphism cards, and cyan/violet accents (`#08B962`, vibrant blues). Demonstrates how lightweight 3D elements can complement product UI without hijacking document flow. |
| **Awwwards** (`https://www.awwwards.com/`) | **200 OK** | Editorial typography, card-based grid rhythm, high-contrast monochrome layouts (`#000000`, `#121212`), smooth spring hover transitions, magnetic buttons, and data density balance. |
| **Motion.dev** (`https://motion.dev/`) | **200 OK** | High-performance spring animations (`stiffness`, `damping`), gesture-driven hover/tap feedback, layout animation without layout shift, and strict reduced-motion adherence. |
| **Codrops** (`https://tympanus.net/codrops/`) | **403 Forbidden** *(Cloudflare bot challenge)* | Direct automated fetch blocked by Cloudflare anti-bot challenge. Recognized for pioneering SVG link morphing, canvas connection networks, and interactive node graphs. |

---

## 2. Comparative Analysis Matrix

### Visual Hierarchy & Typography
- **Linear & Awwwards**: Bold, editorial headline statements paired with tight, legible sans-serif body type (Inter/system stacks). High-contrast metadata tokens (e.g. `[11px] font-mono uppercase`) provide instant scannability for audit trails and timestamps.
- **Application to EvidenceCheck**: Large editorial headline in the hero, high-contrast monospace tokens for passage IDs (`psg-1`), source IDs (`src-1`), and verification badges.

### Color Theory & Depth
- **Linear**: Multi-layered dark surface architecture (`#08090A` base, `#121824` surface, `#1A2436` elevated). Avoids pitch-black pure `#000000` in favor of deep chromatic slate with cyan/blue ambient light.
- **Application to EvidenceCheck**: Adopt the proposed **Evidence Constellation** palette:
  - Deep Celestial Background: `#080D16`
  - Forensic Surface: `#111B2A`
  - Elevated Card Surface: `#192739`
  - Signature Constellation Cyan Accent: `#23C9C5`
  - Primary Text: `#EAF2F7`
  - Secondary Text: `#94A3B8`
  - Evidence Status Colors: Only for ground truth (`#10B981` emerald for verified, `#F43F5E` rose for failed/refuted, `#F59E0B` amber for contradiction/insufficient).

### 3D & Procedural Geometry
- **Bruno Simon vs. Spline**: Full Three.js physics scenes are inappropriate for an evidence verification tool where judges and analysts must read verbatim quotes. However, an abstract, procedural 2D/3D **Evidence Constellation** canvas (particles connected by dynamic neural/evidence filaments that respond smoothly to cursor movements) conveys scientific intelligence without blocking readability or adding huge bundle weights.

---

## 3. Techniques Adopted vs. Rejected

| Technique | Status | Architectural Rationale |
| :--- | :--- | :--- |
| **Procedural Constellation Canvas** | **ADOPTED** | Lightweight procedural canvas (zero external 3D asset downloads, <5 KB runtime footprint, 60fps) with particle nodes and connection filaments responding to cursor parallax. |
| **Interactive Evidence Graph** | **ADOPTED** | 2.5D visual evidence trail mapping `Claim → Sources → Passages → Citations → Verdict`. Clicking nodes highlights real connections and reveals verbatim quotes. |
| **Micro-Interactions & Spring Motion** | **ADOPTED** | Physics-based hover expansion, smooth badge pulses, and progressive disclosures with strict `prefers-reduced-motion` compliance. |
| **Scroll Hijacking** | **REJECTED** | Disables natural scroll momentum. Fatal for evidence review where users need to rapidly scroll between citations and sources. |
| **Heavy 3D Physics Mesh Imports** | **REJECTED** | Large GLTF models (3MB+) cause poor mobile LCP and distract from factual evidence scrutiny. |
| **Constant Aggressive Animations** | **REJECTED** | Pulsing backgrounds or spinning badges create visual fatigue and erode trustworthiness in an intelligence platform. |

---

## 4. The "Evidence Constellation" Design Language

**Evidence Constellation** positions EvidenceCheck AI as an elite scientific intelligence observatory.
1. **Atmosphere**: Deep astronomical slate `#080D16` with cyan energy lines `#23C9C5`.
2. **Constellation Canvas**: Procedurally generated constellation nodes floating in subtle parallax space behind the editorial hero.
3. **The Signature Evidence Trail**: An interactive evidence constellation graph where authentic sources, passages, and audited citations form visible luminous trajectories culminating in the verdict.
4. **Editorial Precision**: Crisp monospaced coordinates, verified badge pills, and expandable verbatim quote audit drawers.
