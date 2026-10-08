# Native iOS Roadmap

A native iOS target is intentionally deferred until the web/PWA and Android data contracts stabilize. The repository does not currently contain an Xcode project.

The future implementation should use Swift and SwiftUI with shared, documented JSON models—not copied Android UI code.

## Planned integrations

1. **App Intents**
   - Add Expense
   - Open Records
   - Show Today's Spending
   - Show Remaining Budget

2. **Home Screen Quick Actions**
   - Add Expense
   - Records

3. **WidgetKit**
   - Small: amount spent today
   - Medium: today, monthly total and Add Expense action
   - Privacy redaction for the lock screen and widget previews

4. **Siri and Shortcuts**
   - “Record an expense in Saan Napunta”
   - “How much did I spend today?”

5. **Storage and sync**
   - Local SwiftData/Core Data ledger
   - Optional authenticated sync compatible with the web ledger format
   - Photos remain device-only unless a later privacy decision explicitly changes that

## Before creating the Xcode project

- Finalize the permanent bundle identifier.
- Finalize the app icon and store artwork.
- Complete schema-versioned web/Android storage migrations.
- Document the shared ledger and budget schemas.
- Decide minimum supported iOS version.
- Enroll in the Apple Developer Program for device distribution and App Store release.
