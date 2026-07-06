---
product: APP D1
personality:
  - clear
  - serious
  - fast
  - light
  - operational
colors:
  brand: "#e51d2e"
  brand_dark: "#c41525"
  brand_soft: "#fff1f2"
  background: "#f3f6fb"
  surface: "#ffffff"
  surface_muted: "#f8fafc"
  text: "#0f172a"
  text_muted: "#475569"
typography:
  sans: "Arial, Helvetica, sans-serif"
  mono: '"Courier New", Courier, monospace'
spacing:
  scale: "4px base rhythm; prefer compact but breathable layouts"
radii:
  cards: "24px to 34px"
  pills: "9999px"
  inputs: "18px to 22px"
shadows:
  cards: "soft, low-opacity shadows only"
  hero: "moderate shadow; never heavy or dark"
surfaces:
  default: "soft background + white cards"
  accent: "brand red only as a highlight or small panel"
ctas:
  primary: "one primary CTA per section"
  secondary: "neutral secondary actions"
density:
  target: "medium-low"
  rule: "if a screen feels crowded, reduce density before adding more cards"
---

# DESIGN.md

This file is the visual contract for APP D1.
Before touching any UI, read this file first.

## Purpose

APP D1 is an operational retail tool, not a marketing site.
It should feel clear, serious, fast, and light.
The interface must help supervisors act quickly without visual noise.

## Visual Identity

- Use red D1 as an accent, not a dominant block.
- Prefer soft backgrounds and white surfaces.
- Keep cards light, with minimal or soft shadows.
- Use clean hierarchy: title, context, primary action, support.
- Keep copy short and operational.

## Core Principles

- Less density beats more decoration.
- Reuse existing patterns before inventing new ones.
- One clear primary CTA per section.
- Avoid repeated badges, chips, or competing buttons.
- Mobile must remain usable without crowding.
- Do not create a new visual language per screen.

## Correct Use of Red D1

- Red D1 is for emphasis, alerts, and key actions.
- Do not use large solid red backgrounds unless there is a strong reason.
- Prefer small accent bars, badges, icons, borders, or compact hero highlights.
- Red should guide attention, not dominate the full page.

## Backgrounds and Surfaces

- Default background should be soft and calm.
- White cards are the main surface.
- Use muted panels only when they support scanning.
- Avoid dark heavy blocks unless the product context truly needs it.

## Cards

- Cards should breathe.
- Prefer fewer cards with clearer labels.
- Keep padding and spacing consistent.
- Use cards to group information, not to multiply noise.

## Navigation

- Navigation must be compact and calm.
- Top and bottom nav should not compete with page content.
- Keep the active state obvious but not loud.

## Buttons and CTAs

- One primary CTA per section.
- Secondary actions should look secondary.
- Avoid too many outlined or colored buttons in the same row.
- Important actions must remain visible and easy to tap.

## Badges and Chips

- Use badges only when they add immediate meaning.
- Prefer fewer chips.
- Badges should summarize status, not become decoration.

## Tables and Mallas

- Tables, grids, and manual matrices should be readable first.
- Keep headers clear and cells compact.
- Avoid over-stuffing each cell with extra text.
- Preserve horizontal scanning when needed.

## Forms

- Forms must be calm, direct, and short.
- Group inputs logically.
- Avoid long walls of fields.
- Keep labels clear and operational.

## Mobile / Responsive

- Mobile must remain usable without saturation.
- Stack content in a sensible order.
- Reduce density before shrinking text too much.
- Avoid layouts that rely on wide screens to make sense.

## What to Avoid

- Heavy red hero blocks.
- Excessive card stacks.
- Too many badges, chips, or repeated CTA styles.
- Long copy where a short operational phrase is enough.
- New visual patterns without a clear reason.
- Reworking unrelated screens during a visual task.

## Rules for AI Agents

- Read this file before editing any UI.
- Reuse existing patterns already present in APP D1.
- Make the smallest safe visual change.
- Do not introduce new visual systems unless this file is updated.
- If a screen feels crowded, simplify first.
- If a change affects structure, spacing, or hierarchy, explain why it is needed.

## Checklist Before Modifying UI

- Is this change visible and useful?
- Is there already a pattern in the app that can be reused?
- Can the change stay within the current visual language?
- Does the page keep a clear primary action?
- Does the screen remain calm on mobile?
- Did we avoid touching logic, data, permissions, or APIs?
- Did we keep the diff as small as possible?
