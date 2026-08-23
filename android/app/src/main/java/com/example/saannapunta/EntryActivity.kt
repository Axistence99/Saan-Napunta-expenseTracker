package com.example.saannapunta

import android.app.Activity
import android.app.AlertDialog
import android.app.DatePickerDialog
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.util.Calendar

/** Add or edit a single expense. */
class EntryActivity : Activity() {

    private val store by lazy { ExpenseStore(this) }
    private var editing: Expense? = null
    private var selectedCategory = "food"
    private var selectedDate = todayKey()

    private lateinit var amountField: EditText
    private lateinit var noteField: EditText
    private lateinit var dateButton: Button
    private lateinit var chipRow: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        editing = store.find(intent.getStringExtra(EXTRA_ID))
        editing?.let {
            selectedCategory = it.category
            selectedDate = it.date
        }

        val root = FrameLayout(this)
        root.addView(GradientBackgroundView(this), FrameLayout.LayoutParams(MATCH, MATCH))

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(28), dp(20), dp(28))
        }

        content.addView(TextView(this).apply {
            text = getString(if (editing == null) R.string.add_expense else R.string.edit_expense)
            textSize = 26f
            setTextColor(getColor(R.color.text_primary))
        })

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(R.drawable.card_background)
            setPadding(dp(18), dp(18), dp(18), dp(18))
        }

        card.addView(label("Amount"))
        amountField = EditText(this).apply {
            hint = "0.00"
            textSize = 30f
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            setTextColor(getColor(R.color.text_primary))
            editing?.let { setText("%.2f".format(it.amount)) }
        }
        val amountRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        amountRow.addView(TextView(this).apply {
            text = store.currency
            textSize = 30f
            setTextColor(getColor(R.color.accent_light))
        })
        amountRow.addView(amountField, LinearLayout.LayoutParams(0, WRAP, 1f))
        card.addView(amountRow)

        card.addView(label("Category"))
        chipRow = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        card.addView(chipRow)
        renderChips()

        card.addView(label("Date"))
        dateButton = Button(this).apply {
            text = prettyDay(selectedDate)
            setOnClickListener { pickDate() }
        }
        card.addView(dateButton, LinearLayout.LayoutParams(MATCH, WRAP))

        card.addView(label("Note (optional)"))
        noteField = EditText(this).apply {
            hint = "Jeep fare, lunch, load\u2026"
            inputType = InputType.TYPE_CLASS_TEXT
            setTextColor(getColor(R.color.text_primary))
            setText(editing?.note ?: "")
        }
        card.addView(noteField, LinearLayout.LayoutParams(MATCH, WRAP))

        content.addView(card, LinearLayout.LayoutParams(MATCH, WRAP).apply { topMargin = dp(16) })

        content.addView(Button(this).apply {
            text = getString(R.string.save_expense)
            setBackgroundResource(R.drawable.fab_background)
            setTextColor(Color.parseColor("#1A0D00"))
            setOnClickListener {
                performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
                save()
            }
        }, LinearLayout.LayoutParams(MATCH, WRAP).apply { topMargin = dp(18) })

        if (editing != null) {
            content.addView(TextView(this).apply {
                text = getString(R.string.delete_expense)
                textSize = 13f
                gravity = Gravity.CENTER
                setPadding(0, dp(16), 0, 0)
                setTextColor(getColor(R.color.danger))
                setOnClickListener { confirmDelete() }
            }, LinearLayout.LayoutParams(MATCH, WRAP))
        }

        val scroll = ScrollView(this).apply { isFillViewport = true }
        scroll.addView(content, ViewGroup.LayoutParams(MATCH, WRAP))
        root.addView(scroll, FrameLayout.LayoutParams(MATCH, MATCH))
        setContentView(root)
    }

    private fun renderChips() {
        chipRow.removeAllViews()
        var line = newChipLine()
        CATEGORIES.forEachIndexed { index, category ->
            if (index % 3 == 0 && index > 0) {
                chipRow.addView(line)
                line = newChipLine()
            }
            val chip = TextView(this).apply {
                text = category.label
                setCompoundDrawablesRelativeWithIntrinsicBounds(category.iconRes, 0, 0, 0)
                compoundDrawablePadding = dp(8)
                compoundDrawableTintList = android.content.res.ColorStateList.valueOf(
                    getColor(if (category.id == selectedCategory) R.color.accent_light else R.color.text_muted)
                )
                textSize = 13f
                gravity = Gravity.CENTER
                setPadding(dp(10), dp(10), dp(10), dp(10))
                setTextColor(getColor(if (category.id == selectedCategory) R.color.accent_light else R.color.text_primary))
                setBackgroundResource(R.drawable.card_background)
                alpha = if (category.id == selectedCategory) 1f else 0.65f
                setOnClickListener {
                    selectedCategory = category.id
                    renderChips()
                }
            }
            line.addView(chip, LinearLayout.LayoutParams(0, WRAP, 1f).apply {
                marginEnd = dp(6)
                topMargin = dp(6)
            })
        }
        chipRow.addView(line)
    }

    private fun newChipLine() = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }

    private fun pickDate() {
        val parts = selectedDate.split("-").mapNotNull { it.toIntOrNull() }
        val calendar = Calendar.getInstance()
        if (parts.size == 3) calendar.set(parts[0], parts[1] - 1, parts[2])
        DatePickerDialog(
            this,
            { _, year, month, day ->
                selectedDate = "%04d-%02d-%02d".format(year, month + 1, day)
                dateButton.text = prettyDay(selectedDate)
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    private fun save() {
        val amount = amountField.text.toString().toDoubleOrNull()
        if (amount == null || amount <= 0.0) {
            Toast.makeText(this, "Enter an amount greater than zero.", Toast.LENGTH_SHORT).show()
            return
        }
        val entry = Expense(
            id = editing?.id ?: "e${System.currentTimeMillis()}",
            amount = amount,
            category = selectedCategory,
            merchant = editing?.merchant.orEmpty(),
            item = editing?.item.orEmpty(),
            note = noteField.text.toString().trim(),
            date = selectedDate,
            created = editing?.created ?: System.currentTimeMillis(),
            photoCount = editing?.photoCount ?: 0
        )
        store.save(entry)
        Toast.makeText(this, "Saved ${money(store.currency, amount)}.", Toast.LENGTH_SHORT).show()
        finish()
    }

    private fun confirmDelete() {
        val entry = editing ?: return
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.delete_expense))
            .setMessage("${categoryOf(entry.category).label} \u2014 ${money(store.currency, entry.amount)}")
            .setPositiveButton("Delete") { _, _ ->
                store.delete(entry.id)
                finish()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun label(text: String): View = TextView(this).apply {
        this.text = text.uppercase()
        textSize = 11f
        letterSpacing = 0.1f
        setPadding(0, dp(14), 0, dp(4))
        setTextColor(getColor(R.color.text_muted))
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        const val EXTRA_ID = "expense_id"
        private const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
        private const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT
    }
}
