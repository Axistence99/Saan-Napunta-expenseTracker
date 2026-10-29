# Android Daily Expense Reminder

The native Android prototype includes an optional local reminder. It is disabled by default and is enabled only from the native Settings dialog.

## Behavior

- Default time: 12:00 PM in the device timezone
- User may choose another time
- At the scheduled time, the receiver checks `ExpenseStore`
- If at least one expense exists today, no notification appears
- If today's ledger is empty, Android shows:
  - **Record today’s expenses**
  - **Have you spent any money today?**
- Tapping **Add expense** opens `EntryActivity`
- Tapping the notification opens `MainActivity`

## Scheduling

`ExpenseReminderScheduler` uses a one-shot `AlarmManager.setAndAllowWhileIdle` alarm rather than an exact alarm. Android may delay delivery to protect battery. After the alarm fires, the receiver schedules the next local day, which handles daylight-saving and timezone changes better than adding a fixed 24 hours.

`ReminderRescheduleReceiver` restores enabled reminders after:

- Device reboot
- Manual clock change
- Timezone change
- Application update

## Permissions and privacy

- Android 13+ requests `POST_NOTIFICATIONS` only after the user enables reminders
- If permission is denied, the reminder preference is disabled and the user is informed
- `RECEIVE_BOOT_COMPLETED` is used only to restore a previously enabled alarm
- Notification text is generic and contains no amount, budget, category, or merchant
- The actual reminder receiver is not exported to other apps

## Main files

- `ExpenseReminderScheduler.kt`
- `ExpenseReminderReceiver.kt`
- `ReminderRescheduleReceiver.kt`
- `ExpenseStore.kt`
- `MainActivity.kt`
- `AndroidManifest.xml`
