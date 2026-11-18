# Memory Lab — Vibrant Academic Tech Lab

## Intent and domain

For a HCMUE lecturer presenting operating-system memory algorithms and a student following one click at a time. The focal element is the operation happening now; the learner must see which address/page/frame is involved and why it changes.

Domain: address bounds, page/offset translation, TLB lookup, page-table entries, finite RAM frames, dirty write-back, FIFO/LRU/OPT/Clock evidence.

Color world: navy instrument panel, white lecture canvas, coral protection signals, amber scan cursor, royal-blue address bus, violet OS control, teal data movement.

Signature: a bounded, snapshot-backed event window above a memory workbench. It shows visited steps and the current operation; unseen event names stay hidden. The signature appears in bounds checks, allocation scans, address translation, page-in and Clock microsteps.

Avoided defaults: uniform white navigation cards; a commercial hero; a dashboard of unrelated counters. Use five subject identities, a compact navy header and one simulation surface instead.

## System

- Depth: soft layered shadows on light canvas; borders and surface tints on dark. No glass or neon.
- Spacing: 4px base; component 8/12/16px; section 16/24px. Main panel padding 16px; radius 16px; node radius 12px; button radius 9px.
- Type: local Be Vietnam Pro 400/500/600/700; local JetBrains Mono 500/700 for addresses, formulas and changing numbers. Type roles (rem): metadata .75 (12px), labels .875 (14px), UI .9375 (15px), body 1 (16px), subtitle 1.25 (20px), title 1.375 (22px), numerical values 1.75/2.25 (28/36px). Prose line-height 1.6–1.7; weight 400 for reading, 500 for controls, 600 for labels/headings, 700 for numerical emphasis; font synthesis disabled. No reading text below 12px.
- Header: 88–96px desktop; navy gradient only for product identity. Logo keeps aspect ratio in a white holder.
- Tabs: five 96px navigation cards, one Lucide icon per topic, tinted active surface + stronger top edge + filled icon. Native buttons with roving focus and arrow/Home/End navigation.
- Controls: 44px targets, violet primary Next, themed Play/Pause, neutral Previous/Reset. Always named; SVG is decorative.
- Stepper: at most 5 events desktop, 3 mobile. Only visited events are clickable. Existing MemoryTeaching.seek restores state. Open-ended free allocation says “còn tiếp”; it never claims an unknown final count.
- Models: one active focus, role-colored components, consistent page identity through reference/RAM/evidence, fixed frame positions. Success and denial use labels as well as color.
- Motion: 180–320ms, one-shot, opacity/transform. Newly allocated pages animate only at a real allocation event. No endless victim/trap bounce. Reduced motion removes animation.

## Colors

Source of truth: `assets/css/teaching-scenes.css`.

| Token | Light | Use |
|---|---|---|
| lab-navy | #102447 | Header |
| lab-canvas | #F3F6FC | Page |
| lab-ink / secondary | #18243B / #52647A | Text |
| lab-action | #6254E8 | Next and primary access |
| Demo 1 / 2 / 3 / 4 / 5 | #DC4267 / #D97706 / #2563EB / #7C3AED / #0D9488 | Navigation identity |
| lab-success / danger | #18734E / #BB2948 | Hit, allowed / denied, victim |
| lab-warning / data / mapping | #8B5200 / #09776C / #7137BF | Scan / page-in / lookup-control |

Demo text and solid badges use stronger shades than the accent swatches when required for contrast. Dark tokens use brighter ink on separately defined dark washes; swapping themes is atomic to avoid interpolated low-contrast frames. A topic's coral/teal identity never implies success/failure.

## References and critique

UI UX Pro Max: search and apply keyboard focus, contextual live status, reduced motion and contrast guidelines. Automatic education style searches returned portfolio/children's directions; these were rejected as unsuitable, and the user's explicit Academic Tech Lab direction controls the design.

Interface Design: domain exploration, one focal point, type/space hierarchy, native controls, token architecture, and rendered desktop/mobile critique.

Radix Colors: read light/dark scales and use the separation of surface/border/solid/high-contrast text roles. Lucide: local SVG sprite only. No React dependency, no animation library.

Review decisions: compact example/input row on desktop; RAM before/after actions stay legible; comparisons and detailed explanation remain collapsible; the second allocation mode retains the same engine/controller. Detailed source revisions and test evidence live under `docs/`.
