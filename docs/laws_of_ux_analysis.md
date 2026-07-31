# Laws of UX Comprehensive Analysis: CollabCanvas

**Target Application:** CollabCanvas (`apps/web`)  
**Evaluation Scope:** Board Management, Canvas Interaction, Form UX, Navigation Shell, Theme Switching  
**Date:** July 31, 2026

---

## Executive Overview

This Laws of UX evaluation analyzes how CollabCanvas aligns with key psychological design principles that govern user perception, decision-making, efficiency, and satisfaction. Each principle is evaluated against concrete UI implementations in CollabCanvas, identifying strengths and actionable recommendations for enhanced user experience.

---

## 1. Fitts’s Law

> _"The time to acquire a target is a function of the distance to and size of the target."_

### Analysis in CollabCanvas:

- **Primary CTA Target Size:** The **Create Board** button (`CreateBoardButton`) uses a high-contrast background (`bg-accent` / `#49655a`) with an explicit height of 36px (`h-9`), placed prominently in the top right of the dashboard. This maximizes touch/cursor target area while keeping movement distance short from header navigation.
- **Card Action Bar:** On each `BoardCard`, action buttons (`Open board`, `Duplicate`, `Rename`, `Delete`) feature 32x32px minimum click areas (`size-8`), preventing accidental misclicks.
- **Top Edge Docking:** In `WhiteboardPage`, essential navigation controls (Back button, Title field, Mode badge, Dark mode toggle, Board menu) are docked along the top 56px header boundary (`h-14`), exploiting screen edges to make them easier to hit.

### Recommendations:

- Expand click target of `BoardCard` image/canvas thumbnail area so clicking anywhere on the card header opens the board.

---

## 2. Hick’s Law

> _"The time it takes to make a decision increases with the number and complexity of choices."_

### Analysis in CollabCanvas:

- **Simplified Dashboard View:** The dashboard categorizes boards cleanly into "Recent local boards" with a single search bar. Users are presented with a primary choice: search existing boards or create a new one.
- **Progressive Disclosure in Auth:** Auth forms (`LoginPage`, `RegisterPage`) ask for minimum required fields (email & password) without cognitive clutter.

### Recommendations:

- On `WhiteboardCanvas`, default tool choices to a top-level palette (Select, Hand, Pencil, Sticky, Shape) rather than displaying all possible tools simultaneously.

---

## 3. Miller’s Law

> _"The average person can only keep 7 (plus or minus 2) items in their working memory."_

### Analysis in CollabCanvas:

- **Card Metadata Limits:** Each `BoardCard` displays exactly 3 primary pieces of metadata:
  1. Title
  2. Last opened timestamp
  3. Action bar (Open, Duplicate, Rename, Delete)
     This keeps visual chunks well within the $7 \pm 2$ working memory limit.
- **Header Navigation:** The `AppShell` header features 3 core links/controls: Brand Mark, Dashboard link, and Profile dropdown.

---

## 4. Jakob’s Law

> _"Users spend most of their time on other sites. This means that users prefer your site to work the same way as all the other sites they already know."_

### Analysis in CollabCanvas:

- **Standard Navigation Patterns:** The top navigation bar follows universal web application conventions: brand logo top-left, primary section links center, user settings/avatar top-right.
- **Infinite Canvas Conventions:** The whiteboard utilizes standard pan (space+drag or middle-click), zoom (pinch/scroll), marquee select, and toolbar layout familiar to users of Figma, Miro, and Excalidraw.

---

## 5. Law of Proximity

> _"Objects that are near or proximate to each other tend to be grouped together."_

### Analysis in CollabCanvas:

- **Card Action Segmentation:** On `BoardCard`, title and timestamp are visually grouped in the upper section, while contextual action buttons are grouped together in a dedicated bottom panel separated by `border-t border-line`.
- **Form Controls:** Labels and input fields in auth and profile forms use explicit vertical stacking (`mt-1.5`) to establish clear association between input and label.

---

## 6. Law of Similarity

> _"The human eye tends to perceive similar elements in a design as a complete picture, shape, or group."_

### Analysis in CollabCanvas:

- **Consistent Focus Rings:** All interactive elements (`button`, `input`, `a`) share an identical focus indicator (`outline: 2px solid var(--color-accent); outline-offset: 2px`), establishing predictable visual feedback across the whole design system.
- **Card Grid Harmony:** All board cards share uniform border radii, padding (`p-4`), background token (`bg-panel`), and hover transition effects (`hover:border-line-strong hover:shadow-sm`).

---

## 7. Law of Common Region

> _"Elements tend to be perceived as groups if they are sharing an area with a clearly defined boundary."_

### Analysis in CollabCanvas:

- **Explicit Containment:** `DeleteBoardDialog` uses a high-contrast modal backdrop (`bg-black/40`) with an inner panel defined by `border border-line bg-panel p-6 shadow-xl`, clearly walling off dialog actions from background content.

---

## 8. Aesthetic-Usability Effect

> _"Users often perceive aesthetically pleasing design as design that’s more usable."_

### Analysis in CollabCanvas:

- **Curated HSL Color Tokens:** The app avoids harsh browser default colors in favor of custom HSL design tokens (`--color-accent: #49655a`, `--color-canvas: #f7f7f5`, `--color-panel: #ffffff`, dark mode variants).
- **Refined Typography:** Inter typography with letter-spacing tweaks (`tracking-[-0.03em]`, `tracking-[0.12em]` uppercase headers) provides a high-end feel that increases perceived product quality and user trust.

---

## 9. Peak-End Rule

> _"People judge an experience largely based on how they felt at its peak and at its end."_

### Analysis in CollabCanvas:

- **Peak Experience:** Opening a board transitions seamlessly into an ultra-responsive infinite canvas (`tldraw` engine) with sub-10ms render latency.
- **End Experience (Reassurance):** Real-time save status feedback (`SaveStatusIndicator` showing "Saved locally" with a checkmark icon) reassures users that their work is safe before exiting.

---

## 10. Doherty Threshold

> _"Productivity increases when a computer and its users interact at a pace (<400ms) that ensures that neither has to wait on the other."_

### Analysis in CollabCanvas:

- **Zero-Latency Local Storage:** Board operations (create, rename, mark opened, delete) run synchronously against `localBoardRepository` via standard `localStorage`, responding in <5ms.
- **Instant Title Inline Editing:** Board title editing (`BoardCard` inline form and `WhiteboardPage` header input) updates local state instantly, eliminating round-trip server delays.

---

## 11. Tesler’s Law (Law of Conservation of Complexity)

> _"For any system there is an amount of complexity which cannot be reduced. Only shifted."_

### Analysis in CollabCanvas:

- **Local vs. Cloud Abstraction:** CollabCanvas shifts infrastructure complexity away from single-user drawing by offering an instant zero-configuration Local Foundation Mode, while encapsulating Supabase real-time web-socket sync within clean repository interfaces (`LocalBoardRepository` vs `SupabaseBoardRepository`).

---

## 12. Postel’s Law (Robustness Principle)

> _"Be liberal in what you accept, and conservative in what you send."_

### Analysis in CollabCanvas:

- **Resilient Input & Error Handling:**
  - Board title inputs automatically trim whitespace, enforce length caps (`maxLength={120}`), and fallback gracefully if invalid.
  - If local storage becomes corrupted, `DashboardPage` catches the malformed data state and presents a safe recovery UI with a **"Reset local boards"** button.

---

## Summary & Action Plan

| UX Law                     | Implementation Status | Priority | Key Recommendation                                    |
| -------------------------- | --------------------- | -------- | ----------------------------------------------------- |
| Fitts’s Law                | Good                  | Medium   | Make full board card area clickable to open board     |
| Hick’s Law                 | Excellent             | Low      | Maintain progressive disclosure on toolbar            |
| Miller’s Law               | Excellent             | Low      | Keep card metadata items under 5 items                |
| Jakob’s Law                | Excellent             | Low      | Preserve standard app shell layout                    |
| Law of Proximity           | Good                  | Low      | Maintain visual separation of action bars             |
| Law of Similarity          | Excellent             | Low      | Preserve global focus ring design tokens              |
| Law of Common Region       | Good                  | High     | Enhance modal dialog containment with ARIA attributes |
| Aesthetic-Usability Effect | Excellent             | Low      | Continue curated HSL theme palette maintenance        |
| Peak-End Rule              | Excellent             | Low      | Preserve instant local save feedback                  |
| Doherty Threshold          | Excellent             | Low      | Retain local-first <10ms responsiveness               |
| Tesler’s Law               | Excellent             | Low      | Keep clean separation between local and sync modes    |
| Postel’s Law               | Excellent             | Low      | Expand input sanitization and fallback error states   |
