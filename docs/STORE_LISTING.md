# Store listing — Saan Napunta?

The product name is **Saan Napunta?** everywhere the user sees it in the app.
The descriptor **Gastos Tracker** exists only in store metadata (and as a small in-app tagline),
so the store listing explains what the app does without bloating the launcher label.

## Names at a glance

| Surface | Value | Chars | Limit |
| --- | --- | --- | --- |
| Google Play title | `Saan Napunta? + Gastos Tracker` | 30 | 30 (hard reject above) |
| Apple App Store name | `Saan Napunta?` | 13 | 30 |
| Apple subtitle | `Gastos Tracker` | 14 | 30 |
| Play short description | see below | 66 | 80 |
| Android launcher label (`app_name`) | `Saan Napunta?` | 13 | ~12 visible under the icon |
| Web page `<title>` | `Saan Napunta? + Gastos Tracker` | 30 | — |

Notes:

- The separator is a plus sign (`+`) with a space on each side: `Saan Napunta? + Gastos Tracker`
  lands on exactly 30 characters. A single `+` is fine under Play policy — only excessive or
  repeating decorative symbols are banned. Watch the budget: `Saan Napunta? + Expense Tracker`
  is 31 characters and the Play Console will reject it.
- Front-load the brand: search results truncate around 23–26 characters, so `Saan Napunta?`
  must come first.
- One descriptor only. Extra keywords (budget, peso, ipon, kuripot, offline) belong in the
  short and full descriptions, not the title — Play penalises keyword stuffing.
- `?` is allowed. Emojis, superlatives ("best", "#1"), price/promo text and repeated
  decorative symbols are not.

## Short description (Play, 80 max)

```
Alam mo ba saan napunta ang pera mo? Offline peso expense tracker.
```

Alternates:

```
Offline peso expense tracker. Log gastos in seconds, stay on budget.   (70)
Saan napunta ang sweldo mo? Track gastos, set budget, walang internet. (70)
```

## Full description (Play, 4000 max)

```
Saan napunta ang pera mo?

Saan Napunta? is a simple, offline expense tracker built for Philippine pesos.
Log a gastos in under five seconds, then see exactly where your money went this month.

WHAT YOU GET
• Add, edit and delete expenses — amount, category, date and an optional note
• Nine quick categories: Food, Transport, Bills, Load/Data, Groceries, School, Health, Fun, Other
• Monthly total, today's spend, daily average and entry count at a glance
• Optional monthly budget with a meter that turns red the moment you overspend
• Per-category breakdown so you can see what is really eating your sweldo
• Browse past months and compare
• Export any month to CSV
• Peso by default, with dollar, euro and yen available

PRIVATE BY DESIGN
No account. No sign-up. No sync. No ads. No analytics. The app requests zero permissions
and never connects to the internet. Every entry stays in your device's private storage,
and Erase All Data removes it instantly.

FOR
Students budgeting their baon, employees stretching the sweldo to the next payday, freelancers
tracking business gastos, and anyone tired of expense apps that demand an account first.

Made by Aleksis Ong.
```

## Apple App Store keywords (100 bytes)

```
gastos,peso,budget,ipon,kuripot,expense,tracker,spending,baon,sweldo,offline,philippines
```

Do not repeat words already in the app name or subtitle — Apple indexes those separately.

## Checklist before publishing

- [ ] Play title is exactly 30 characters with the en dash
- [ ] `android:label` / `app_name` is still the short `Saan Napunta?`
- [ ] Icon has no text, badges or "download now" style graphics
- [ ] Screenshots show the dashboard, the add-expense sheet, and the budget meter in the red state
- [ ] Privacy policy URL points at `PRIVACY.md`
- [ ] Data safety form declares: no data collected, no data shared
