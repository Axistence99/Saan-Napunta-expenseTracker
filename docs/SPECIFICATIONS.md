# Specifications

## Goals

1. Record an expense in under five seconds: amount → category chip → save.
2. Answer "how much have I spent this month, and on what?" at a glance.
3. Work fully offline and store nothing outside the device.

## Screens

### Onboarding (first launch)
1. Profile — name + currency
2. Budget period — Daily / Weekly / Monthly / Yearly cards
3. Amount — big field, period-scaled presets, live conversion to the other windows
4. Backup — optional Google sign-in, skippable

Skippable at any step. Sets `onboarded: true` so it never returns.

### Dashboard
- Header: app title + settings button
- Summary card: month label, big total, budget meter, three mini-stats (Today, Daily avg, Entries)
- By-category card: share bars sorted high → low, CSV export action
- Recent card: month picker, entries grouped by day with a per-day subtotal
- Floating action button: add expense

### Entry sheet / EntryActivity
- Amount field with currency symbol (numeric keypad, required, must be > 0)
- Category chips (single select, defaults to Food)
- Date picker (defaults to today)
- Merchant presets per category, or free text
- Item name, 60 characters
- Description, 200 characters
- Up to 3 photos, device-only
- Save; Delete shown only when editing

### Settings
- Your name
- Budget period (converts the existing amount when changed)
- Budget for that period (0 disables the meter)
- Currency: ₱ (default), $, €, ¥
- Week start: Monday (default) or Sunday
- Erase all data, with confirmation

## Categories

| id | Label | Icon |
| --- | --- | --- |
| food | Food | Utensils |
| transport | Transport | Bus |
| bills | Bills | Lightning bolt |
| load | Load / Data | Signal bars |
| groceries | Groceries | Shopping cart |
| school | School | Graduation cap |
| health | Health | Cross in a circle |
| fun | Fun | Game controller |
| other | Other | Tag |

All icons are 24x24 stroke vectors drawn in `currentColor` (inline SVG on web, vector
drawables on Android). No emoji, no icon font, no image assets.

## Rules

- Amounts are rounded to two decimals on save; zero and negative values are rejected.
- Daily average = month total ÷ days elapsed (current month) or days in month (past months).
- Budget meter fills to 100 % maximum and turns red once the total exceeds the budget.
- Editing an entry's date moves the dashboard to that entry's month.
- CSV columns: `date,category,merchant,item,description,amount`; filename `saan-napunta-YYYY-MM.csv`.

## Non-goals for v1

Accounts, cloud sync, multi-currency conversion, income tracking, recurring bills,
receipt photos, shared wallets.

## Visual language

Violet-black base (`#07050B`) with drifting purple and orange gradients. Ink `#F5EFE6`,
grey `#9A93A6`, purple `#8B5CF6`, orange `#FF7E00`, yellow `#FFC53D`, gold `#E9C46A`,
brown `#6B4A2F`, danger `#E5484D`. 22 px rounded cards on a translucent panel with blur.
