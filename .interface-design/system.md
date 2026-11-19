# Memory Workbench

## Intent

A HCMUE lecturer presents memory-management algorithms while students follow each operation. The model must show the current address/page/frame, the condition being evaluated, and the destination of a successful or denied request.

This side-branch redesign retains MemoryTeaching as the sole simulation controller. Views read snapshots; presentation changes must preserve trace length, history, rewind, autoplay, and algorithm results.

## Visual direction

Warm paper, dark instrument surfaces, restrained technical typography. Five connected navigation tabs share one visual language. The main model carries the contrast; controls and optional details sit quietly around it.

Avoid repeated pastel cards, rounded containers around every label, decorative gradients, glows, and animated emphasis unrelated to an event. Use spacing, alignment, a dark RAM material, and one current operation instead.

## Tokens and components

Source: `assets/css/studio.css`; Demo 1: `assets/css/studio-base.css`.

| Role | Light | Dark |
|---|---|---|
| Canvas / sheet | #f2f0e9 / #fbfaf6 | #15201d / #1e2c26 |
| Ink / secondary | #1b2926 / #53635c | #edf0e4 / #becbbf |
| Action / data | #075e54 | #a1d1b9 |
| Scan | #80551c | #e4c48e |
| Denial | #ac382a | #f5b09a |
| Physical RAM material | #243d31 | #243d31 |

- Local Be Vietnam Pro for Vietnamese UI and prose; JetBrains Mono for numerical values, formulas, and small instrument labels. Preserve the established 12/14/16px reading roles. Headings 22–24px; focal numbers 30–38px. Prose line-height 1.6–1.7.
- Spacing 4px base, 12/16/24px groups. Flat panels with fine rules; 2–4px control radii. The bounded Demo 1 workbench can use a larger corner radius.
- Header is dark and compact on desktop. Navigation is one contiguous strip; active tab is solid teal with white text. Native tab buttons retain roving keyboard focus and arrow/Home/End navigation.
- Primary Next/check is solid teal; Play is outlined. Native inputs retain labels and visible focus. Do not wrap every control group in a new card.
- The visited-step rail hides future event names. Its check means completed; a skipped operation explicitly says “Bỏ qua” and uses a dash instead of a check.
- Explanations, history, and advanced inputs remain below the model and optional. On mobile, controls flow in the document so a tall sticky toolbar cannot cover the model or inputs.

## Model rules

- Demo 1 is one bench: CPU request → lower guard → upper guard/adder → distinct RAM and OS ports. The four teaching events remain unchanged.
- For a lower-bound failure, visibly skip the upper comparator. For an invalid offset, skip the adder and never display PA. RAM remains locked. Activate the trap/OS path only at the final event.
- A valid request reaches RAM only after MMU authorization. Pointer labels remain pending until then. The physical range uses `[Base, Base + Limit)` and identifies the final allowed byte separately.
- RAM is an illustrative bounded strip; the allocated region may be enlarged for legibility. Label it “thước minh họa.” Use the same swatches in its legend as in the strip.
- Demo 3/4 use a continuous connected pipeline. Dark RAM retains fixed frame locations. Page identities remain consistent across reference, table, RAM, and evidence.
- Demo 2 keeps the physical allocation strip and existing scan order. Demo 5 keeps stable frame positions, selection evidence, and Clock microsteps.
- Success, failure, pending, and skipped states use text as well as color. Keep existing finite motion; disable animation under reduced motion.

## Validation

Review rendered desktop, tablet, mobile, and both themes. Assert snapshot parity when using Previous/Next, toggling details, changing tabs, or switching theme. Check lower/upper failures, offset failures, Base 0, and large valid values. Automated accessibility scans complement visual and keyboard review.

Evidence and commands: `docs/memory-workbench-review.md`. Existing UI UX Pro Max and Interface Design guidance informs focus, contrast, hierarchy, and rendered critique; the memory model and the user's requested workflow determine the layout.
