# Improvement Implementation Plan

This document tracks the 22 approved improvements. Work is delivered in local phases and is committed or pushed only after explicit approval.

## Confirmed product decisions

- Birthdate and sex at birth remain optional, with a clear on-device explanation.
- Add a validated JSON Device Backup and Restore feature; CSV remains removed.
- Keep the current Android application ID temporarily.
- Use the full staged sequence: reliability, web UX/PWA/security, then Android parity/release.

## Phase 1 — Data reliability and permanent tests

- [x] Add schema-versioned configuration migrations (ledger migration will accompany IndexedDB).
- [ ] Move profile and expense records from localStorage to IndexedDB, with one-time migration and safe fallback.
- [ ] Add permanent automated tests for ranges, budgets, analytics, themes, validation, migrations, sync merges and stored-XSS defenses.
- [ ] Add validated JSON Device Backup and Restore.
- [x] Add unsaved-expense change protection.
- [x] Explain optional personal profile fields and keep them excluded from sync.

## Phase 2 — Records and budget UX

- [ ] Improve Day analytics using optional transaction times or useful transaction buckets.
- [ ] Add removable selected-date chips, Clear all, Select this week and Select this month.
- [ ] Add category, amount, photo and description filters.
- [ ] Add category drill-down from analytics to matching records.
- [ ] Add user-created categories with validated names, icons and colors.
- [ ] Clarify default versus exact-period custom budgets throughout the interface.

## Phase 3 — Themes, accessibility and mobile performance

- [ ] Add theme preview with Apply/Cancel or instant-apply Undo.
- [ ] Reduce decorative work on low-power/mobile devices and pause animation behind open dialogs.
- [ ] Add a dedicated high-contrast, reduced-transparency accessibility theme.
- [ ] Audit keyboard, screen-reader, focus, reduced-motion and color-only states.

## Phase 4 — PWA and web security

- [ ] Add a manifest, installable icons, standalone display mode and offline service worker.
- [ ] Add an appropriate Content Security Policy for the deployed build.
- [ ] Audit every privacy and marketing claim against optional sync behavior.
- [ ] Verify strict Firebase rules and add emulator/rules tests before enabling production sync.

## Phase 5 — Android parity and release preparation

- [ ] Bring native Android screens, records, budgets, profile, themes, detail view, photos and optional sync to web parity.
- [ ] Replace `com.example.saannapunta` before store release; the owner elected to defer the final identifier.
- [ ] Add release build/signing documentation, store checks and Android automated tests.

## Owner-only security action

- [ ] Move the automation SSH key from account-level access to a repository deploy key with write permission, then remove the account-level copy. This requires repository-owner action and cannot be completed solely in application code.
