package com.example.saannapunta

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restores a previously enabled reminder after reboot, clock/timezone changes, or app update. */
class ReminderRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val store = ExpenseStore(context)
        if (store.reminderEnabled) {
            ExpenseReminderScheduler.scheduleNext(context, store.reminderHour, store.reminderMinute)
        }
    }
}
