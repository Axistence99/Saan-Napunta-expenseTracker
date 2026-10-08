package com.example.saannapunta

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/** Home Screen widget showing today's and this month's spending with a direct Add action. */
class SpendingWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { update(context, manager, it) }
    }

    companion object {
        /** Refreshes every placed widget after the local ledger or budget changes. */
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, SpendingWidget::class.java)
            manager.getAppWidgetIds(component).forEach { update(context, manager, it) }
        }

        /** Reads the latest local ledger and renders one RemoteViews widget instance. */
        private fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val store = ExpenseStore(context)
            val items = store.all()
            val today = items.filter { it.date == todayKey() }.sumOf { it.amount }
            val month = items.filter { it.monthKey() == currentMonthKey() }.sumOf { it.amount }
            val views = RemoteViews(context.packageName, R.layout.widget_spending)

            views.setTextViewText(R.id.widget_today, "${money(store.currency, today)} today")
            views.setTextViewText(R.id.widget_month, "${money(store.currency, month)} this month")

            val addIntent = Intent(context, EntryActivity::class.java)
            val addPending = PendingIntent.getActivity(
                context,
                20,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_add, addPending)

            val openIntent = Intent(context, MainActivity::class.java)
            val openPending = PendingIntent.getActivity(
                context,
                21,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, openPending)
            manager.updateAppWidget(widgetId, views)
        }
    }
}
