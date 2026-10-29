package com.example.saannapunta

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build

/** Receives reminder/system alarms, checks today's ledger, and shows a privacy-safe prompt. */
class ExpenseReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val store = ExpenseStore(context)
        if (!store.reminderEnabled) return

        if (intent.action == ExpenseReminderScheduler.ACTION_REMIND) {
            val hasExpenseToday = store.all().any { it.date == todayKey() }
            if (!hasExpenseToday) showReminder(context)
        }

        // One-shot scheduling follows timezone and daylight-saving changes more safely than a fixed 24h repeat.
        ExpenseReminderScheduler.scheduleNext(context, store.reminderHour, store.reminderMinute)
    }

    /** Creates the Android channel and posts the reminder only when permission is available. */
    private fun showReminder(context: Context) {
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.reminder_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = context.getString(R.string.reminder_channel_description)
            }
        )

        val addExpense = PendingIntent.getActivity(
            context,
            1201,
            Intent(context, EntryActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val openApp = PendingIntent.getActivity(
            context,
            1202,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_shortcut_add)
            .setContentTitle(context.getString(R.string.reminder_title))
            .setContentText(context.getString(R.string.reminder_message))
            .setContentIntent(openApp)
            .addAction(R.drawable.ic_shortcut_add, context.getString(R.string.shortcut_add_short), addExpense)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .build()

        manager.notify(NOTIFICATION_ID, notification)
    }

    companion object {
        private const val CHANNEL_ID = "expense_reminders"
        private const val NOTIFICATION_ID = 1200
    }
}
