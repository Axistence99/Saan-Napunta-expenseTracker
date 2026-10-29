package com.example.saannapunta

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/** Schedules one battery-friendly reminder and lets the receiver schedule the following day. */
object ExpenseReminderScheduler {
    const val ACTION_REMIND = "com.example.saannapunta.REMIND_EXPENSE"
    private const val REQUEST_CODE = 1200

    /** Schedules the next local reminder time, rolling to tomorrow when today's time passed. */
    fun scheduleNext(context: Context, hour: Int, minute: Int) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        val trigger = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour.coerceIn(0, 23))
            set(Calendar.MINUTE, minute.coerceIn(0, 59))
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
        }
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            trigger.timeInMillis,
            reminderPendingIntent(context)
        )
    }

    /** Cancels the pending alarm when the user disables reminders. */
    fun cancel(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(reminderPendingIntent(context))
    }

    private fun reminderPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, ExpenseReminderReceiver::class.java).setAction(ACTION_REMIND)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
