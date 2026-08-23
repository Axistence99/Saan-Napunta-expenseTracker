package com.example.saannapunta

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import java.util.Calendar

/** Dashboard: monthly total, budget meter, category breakdown and recent entries. */
class MainActivity : Activity() {

    private val store by lazy { ExpenseStore(this) }
    private var viewMonth = currentMonthKey()

    private lateinit var monthLabel: TextView
    private lateinit var totalText: TextView
    private lateinit var budgetBar: ProgressBar
    private lateinit var budgetLegend: TextView
    private lateinit var statsRow: LinearLayout
    private lateinit var breakdownList: LinearLayout
    private lateinit var entriesList: LinearLayout
    private lateinit var monthSpinner: Spinner
    private var suppressSpinner = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = FrameLayout(this)
        root.addView(
            GradientBackgroundView(this),
            FrameLayout.LayoutParams(MATCH, MATCH)
        )

        val scroll = ScrollView(this).apply { isFillViewport = true }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(28), dp(20), dp(120))
        }

        content.addView(buildHeader())
        content.addView(TextView(this).apply {
            text = getString(R.string.app_tagline).uppercase()
            textSize = 11f
            letterSpacing = 0.22f
            gravity = Gravity.CENTER
            setTextColor(getColor(R.color.accent_light))
        }, LinearLayout.LayoutParams(MATCH, WRAP))
        content.addView(buildSummaryCard(), cardParams())
        content.addView(buildBreakdownCard(), cardParams())
        content.addView(buildEntriesCard(), cardParams())
        content.addView(footerText(getString(R.string.development_warning), R.color.gold))
        content.addView(footerText(getString(R.string.privacy_note), R.color.text_muted))
        content.addView(footerText(getString(R.string.credit), R.color.text_muted))

        scroll.addView(content, ViewGroup.LayoutParams(MATCH, WRAP))
        root.addView(scroll, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(buildFab(), FrameLayout.LayoutParams(dp(64), dp(64), Gravity.END or Gravity.BOTTOM).apply {
            marginEnd = dp(22)
            bottomMargin = dp(28)
        })

        setContentView(root)
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    /* ---------- view builders ---------- */

    private fun buildHeader(): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val title = TextView(this).apply {
            text = getString(R.string.app_name)
            textSize = 30f
            setTextColor(getColor(R.color.text_primary))
        }
        val settings = Button(this).apply {
            text = getString(R.string.settings)
            setOnClickListener { showSettings() }
        }
        row.addView(title, LinearLayout.LayoutParams(0, WRAP, 1f))
        row.addView(settings, LinearLayout.LayoutParams(WRAP, WRAP))
        return row
    }

    private fun buildSummaryCard(): View {
        val card = card()

        monthLabel = TextView(this).apply {
            text = "This month"
            textSize = 12f
            letterSpacing = 0.14f
            setTextColor(getColor(R.color.text_muted))
        }
        totalText = TextView(this).apply {
            textSize = 40f
            setTextColor(getColor(R.color.text_primary))
        }
        budgetBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progressTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.accent_light))
        }
        budgetLegend = TextView(this).apply {
            textSize = 13f
            setTextColor(getColor(R.color.text_muted))
        }
        statsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(12), 0, 0)
        }

        card.addView(monthLabel)
        card.addView(totalText)
        card.addView(budgetBar, LinearLayout.LayoutParams(MATCH, dp(10)).apply { topMargin = dp(10) })
        card.addView(budgetLegend, LinearLayout.LayoutParams(MATCH, WRAP).apply { topMargin = dp(6) })
        card.addView(statsRow, LinearLayout.LayoutParams(MATCH, WRAP))
        return card
    }

    private fun buildBreakdownCard(): View {
        val card = card()
        val heading = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        heading.addView(sectionTitle("By category"), LinearLayout.LayoutParams(0, WRAP, 1f))
        heading.addView(TextView(this).apply {
            text = getString(R.string.export_csv)
            textSize = 13f
            setTextColor(getColor(R.color.gold))
            setOnClickListener { shareCsv() }
        })
        breakdownList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        card.addView(heading)
        card.addView(breakdownList, LinearLayout.LayoutParams(MATCH, WRAP).apply { topMargin = dp(8) })
        return card
    }

    private fun buildEntriesCard(): View {
        val card = card()
        val heading = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        heading.addView(sectionTitle("Recent"), LinearLayout.LayoutParams(0, WRAP, 1f))
        monthSpinner = Spinner(this)
        heading.addView(monthSpinner, LinearLayout.LayoutParams(dp(170), WRAP))
        entriesList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        card.addView(heading)
        card.addView(entriesList, LinearLayout.LayoutParams(MATCH, WRAP).apply { topMargin = dp(8) })
        return card
    }

    private fun buildFab(): View = TextView(this).apply {
        text = "+"
        textSize = 30f
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#1A0D00"))
        setBackgroundResource(R.drawable.fab_background)
        elevation = dp(8).toFloat()
        contentDescription = getString(R.string.add_expense)
        setOnClickListener {
            performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
            startActivity(Intent(this@MainActivity, EntryActivity::class.java))
        }
    }

    /* ---------- rendering ---------- */

    private fun refresh() {
        val currency = store.currency
        val items = store.forMonth(viewMonth)
        val total = items.sumOf { it.amount }

        monthLabel.text = if (viewMonth == currentMonthKey()) "This month" else prettyMonth(viewMonth)
        totalText.text = money(currency, total)

        val budget = store.budget
        if (budget > 0) {
            budgetBar.visibility = View.VISIBLE
            budgetBar.progress = ((total / budget) * 100).coerceIn(0.0, 100.0).toInt()
            val left = budget - total
            budgetLegend.text = if (left >= 0) {
                "${money(currency, left)} left of ${money(currency, budget)}"
            } else {
                "${money(currency, -left)} over your ${money(currency, budget)} budget"
            }
            budgetLegend.setTextColor(getColor(if (left >= 0) R.color.text_muted else R.color.danger))
        } else {
            budgetBar.visibility = View.GONE
            budgetLegend.text = "No budget set \u2014 add one in settings."
            budgetLegend.setTextColor(getColor(R.color.text_muted))
        }

        renderStats(currency, items, total)
        renderBreakdown(currency, items, total)
        renderEntries(currency, items)
        renderMonthSpinner()
    }

    private fun renderStats(currency: String, items: List<Expense>, total: Double) {
        statsRow.removeAllViews()
        val today = items.filter { it.date == todayKey() }.sumOf { it.amount }
        val daysElapsed = if (viewMonth == currentMonthKey()) {
            Calendar.getInstance().get(Calendar.DAY_OF_MONTH)
        } else {
            daysInMonth(viewMonth)
        }
        listOf(
            "Today" to money(currency, today),
            "Daily avg" to money(currency, total / daysElapsed.coerceAtLeast(1)),
            "Entries" to items.size.toString()
        ).forEach { (label, value) ->
            val column = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            column.addView(TextView(this).apply {
                text = label.uppercase()
                textSize = 10f
                letterSpacing = 0.1f
                setTextColor(getColor(R.color.text_muted))
            })
            column.addView(TextView(this).apply {
                text = value
                textSize = 15f
                setTextColor(getColor(R.color.text_primary))
            })
            statsRow.addView(column, LinearLayout.LayoutParams(0, WRAP, 1f))
        }
    }

    private fun renderBreakdown(currency: String, items: List<Expense>, total: Double) {
        breakdownList.removeAllViews()
        if (items.isEmpty()) {
            breakdownList.addView(mutedText("No spending recorded for this month yet."))
            return
        }
        items.groupBy { it.category }
            .mapValues { entry -> entry.value.sumOf { it.amount } }
            .toList()
            .sortedByDescending { it.second }
            .forEach { (id, value) ->
                val meta = categoryOf(id)
                val share = if (total > 0) ((value / total) * 100).toInt() else 0
                val row = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(0, dp(8), 0, dp(8))
                }
                row.addView(categoryIcon(meta, 20), LinearLayout.LayoutParams(dp(34), WRAP))

                val labelColumn = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
                labelColumn.addView(TextView(this).apply {
                    text = meta.label
                    textSize = 14f
                    setTextColor(getColor(R.color.text_primary))
                })
                labelColumn.addView(
                    ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
                        max = 100
                        progress = share
                        progressTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.accent))
                    },
                    LinearLayout.LayoutParams(MATCH, dp(6)).apply { topMargin = dp(4) }
                )
                row.addView(labelColumn, LinearLayout.LayoutParams(0, WRAP, 1f))

                row.addView(TextView(this).apply {
                    text = "${money(currency, value)}\n$share%"
                    textSize = 13f
                    gravity = Gravity.END
                    setTextColor(getColor(R.color.text_primary))
                }, LinearLayout.LayoutParams(WRAP, WRAP))
                breakdownList.addView(row)
            }
    }

    private fun renderEntries(currency: String, items: List<Expense>) {
        entriesList.removeAllViews()
        if (items.isEmpty()) {
            entriesList.addView(mutedText(getString(R.string.empty_entries)))
            return
        }
        var currentDay = ""
        items.forEach { entry ->
            if (entry.date != currentDay) {
                currentDay = entry.date
                val dayTotal = items.filter { it.date == currentDay }.sumOf { it.amount }
                entriesList.addView(TextView(this).apply {
                    text = "${prettyDay(currentDay)}   \u00B7   ${money(currency, dayTotal)}"
                    textSize = 11f
                    letterSpacing = 0.08f
                    setPadding(0, dp(12), 0, dp(4))
                    setTextColor(getColor(R.color.text_muted))
                })
            }
            val meta = categoryOf(entry.category)
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(4), dp(10), dp(4), dp(10))
                isClickable = true
                setOnClickListener {
                    startActivity(
                        Intent(this@MainActivity, EntryActivity::class.java)
                            .putExtra(EntryActivity.EXTRA_ID, entry.id)
                    )
                }
                setOnLongClickListener {
                    confirmDelete(entry)
                    true
                }
            }
            row.addView(categoryIcon(meta, 22), LinearLayout.LayoutParams(dp(36), WRAP))
            val info = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            info.addView(TextView(this).apply {
                text = entry.item.ifBlank { entry.merchant.ifBlank { meta.label } }
                textSize = 15f
                setTextColor(getColor(R.color.text_primary))
            })
            info.addView(TextView(this).apply {
                text = listOf(
                    if (entry.item.isNotBlank()) entry.merchant else "",
                    entry.note
                ).filter { it.isNotBlank() }.joinToString(" \u00b7 ").ifBlank { meta.label }
                textSize = 12f
                maxLines = 1
                setTextColor(getColor(R.color.text_muted))
            })
            row.addView(info, LinearLayout.LayoutParams(0, WRAP, 1f))
            row.addView(TextView(this).apply {
                text = money(currency, entry.amount)
                textSize = 15f
                setTextColor(getColor(R.color.text_primary))
            })
            entriesList.addView(row)
        }
    }

    private fun renderMonthSpinner() {
        val months = store.months()
        suppressSpinner = true
        monthSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            months.map { prettyMonth(it) }
        )
        monthSpinner.setSelection(months.indexOf(viewMonth).coerceAtLeast(0))
        monthSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (suppressSpinner) {
                    suppressSpinner = false
                    return
                }
                viewMonth = months[position]
                refresh()
            }

            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
        }
    }

    /* ---------- dialogs & actions ---------- */

    private fun confirmDelete(entry: Expense) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.delete_expense))
            .setMessage("${categoryOf(entry.category).label} \u2014 ${money(store.currency, entry.amount)}")
            .setPositiveButton("Delete") { _, _ ->
                store.delete(entry.id)
                refresh()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showSettings() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(16), dp(24), 0)
        }
        val budgetField = EditText(this).apply {
            hint = getString(R.string.monthly_budget)
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            if (store.budget > 0) setText("%.0f".format(store.budget))
        }
        val currencies = listOf("\u20B1", "$", "\u20AC", "\u00A5")
        val currencySpinner = Spinner(this).apply {
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, currencies)
            setSelection(currencies.indexOf(store.currency).coerceAtLeast(0))
        }
        layout.addView(budgetField)
        layout.addView(currencySpinner)

        AlertDialog.Builder(this)
            .setTitle(getString(R.string.settings))
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                store.budget = budgetField.text.toString().toDoubleOrNull() ?: 0.0
                store.currency = currencies[currencySpinner.selectedItemPosition]
                refresh()
            }
            .setNeutralButton(getString(R.string.erase_all)) { _, _ -> confirmErase() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmErase() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.erase_all))
            .setMessage("This deletes every expense stored on this device. It cannot be undone.")
            .setPositiveButton("Erase") { _, _ ->
                store.clear()
                refresh()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun shareCsv() {
        val items = store.forMonth(viewMonth)
        if (items.isEmpty()) {
            Toast.makeText(this, "Nothing to export for this month.", Toast.LENGTH_SHORT).show()
            return
        }
        val csv = buildString {
            appendLine("date,category,note,amount")
            items.forEach { entry ->
                val safeNote = entry.note.replace("\"", "\"\"")
                val safeMerchant = entry.merchant.replace("\"", "\"\"")
                val safeItem = entry.item.replace("\"", "\"\"")
                appendLine(
                    "${entry.date},${categoryOf(entry.category).label}," +
                        "\"$safeMerchant\",\"$safeItem\",\"$safeNote\",${"%.2f".format(entry.amount)}"
                )
            }
        }
        startActivity(
            Intent.createChooser(
                Intent(Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(Intent.EXTRA_SUBJECT, "Saan Napunta? ${prettyMonth(viewMonth)}")
                    putExtra(Intent.EXTRA_TEXT, csv)
                },
                getString(R.string.export_csv)
            )
        )
    }

    /* ---------- small helpers ---------- */

    /** Monochrome vector icon tinted with the accent colour. */
    private fun categoryIcon(category: Category, sizeDp: Int) = ImageView(this).apply {
        setImageResource(category.iconRes)
        imageTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.accent_light))
        layoutParams = LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp))
        contentDescription = category.label
    }

    private fun card() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundResource(R.drawable.card_background)
        setPadding(dp(18), dp(18), dp(18), dp(18))
    }

    private fun cardParams() = LinearLayout.LayoutParams(MATCH, WRAP).apply { topMargin = dp(14) }

    private fun sectionTitle(text: String) = TextView(this).apply {
        this.text = text.uppercase()
        textSize = 12f
        letterSpacing = 0.1f
        setTextColor(getColor(R.color.text_muted))
    }

    private fun mutedText(text: String) = TextView(this).apply {
        this.text = text
        textSize = 13f
        setPadding(0, dp(6), 0, dp(6))
        setTextColor(getColor(R.color.text_muted))
    }

    private fun footerText(text: String, colorRes: Int) = TextView(this).apply {
        this.text = text
        textSize = 12f
        gravity = Gravity.CENTER
        setPadding(0, dp(14), 0, 0)
        setTextColor(getColor(colorRes))
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun daysInMonth(monthKey: String): Int {
        val parts = monthKey.split("-").mapNotNull { it.toIntOrNull() }
        if (parts.size != 2) return 30
        val calendar = Calendar.getInstance()
        calendar.set(parts[0], parts[1] - 1, 1)
        return calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
    }

    companion object {
        private const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
        private const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT
    }
}
