package com.example.saannapunta

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

const val PREFS = "saan_napunta_prefs"
const val ENTRIES_KEY = "entries"
const val BUDGET_KEY = "monthly_budget"
const val CURRENCY_KEY = "currency"

data class Category(val id: String, val label: String, val iconRes: Int)

val CATEGORIES = listOf(
    Category("food", "Food", R.drawable.ic_cat_food),
    Category("transport", "Transport", R.drawable.ic_cat_transport),
    Category("bills", "Bills", R.drawable.ic_cat_bills),
    Category("load", "Load / Data", R.drawable.ic_cat_load),
    Category("groceries", "Groceries", R.drawable.ic_cat_groceries),
    Category("school", "School", R.drawable.ic_cat_school),
    Category("health", "Health", R.drawable.ic_cat_health),
    Category("fun", "Fun", R.drawable.ic_cat_fun),
    Category("other", "Other", R.drawable.ic_cat_other)
)

fun categoryOf(id: String): Category = CATEGORIES.firstOrNull { it.id == id } ?: CATEGORIES.last()

/** One recorded expense. [date] is an ISO day string, e.g. 2026-08-23. */
data class Expense(
    val id: String,
    val amount: Double,
    val category: String,
    val merchant: String = "",
    val item: String = "",
    val note: String,
    val date: String,
    val created: Long,
    val photoCount: Int = 0
) {
    fun monthKey(): String = date.take(7)

    /** Field names match the web build so a synced ledger round-trips losslessly. */
    fun toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("amount", amount)
        .put("category", category)
        .put("merchant", merchant)
        .put("item", item)
        .put("note", note)
        .put("date", date)
        .put("created", created)
        .put("photoCount", photoCount)

    companion object {
        fun fromJson(json: JSONObject) = Expense(
            id = json.optString("id"),
            amount = json.optDouble("amount", 0.0),
            category = json.optString("category", "other"),
            merchant = json.optString("merchant", ""),
            item = json.optString("item", ""),
            note = json.optString("note", ""),
            date = json.optString("date", todayKey()),
            created = json.optLong("created", 0L),
            photoCount = json.optInt("photoCount", 0)
        )
    }
}

/**
 * Tiny SharedPreferences-backed store. The whole ledger is a JSON array, which is
 * plenty for a personal expense log and keeps the app dependency-free.
 */
class ExpenseStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun all(): MutableList<Expense> {
        val raw = prefs.getString(ENTRIES_KEY, "[]") ?: "[]"
        val out = mutableListOf<Expense>()
        runCatching {
            val array = JSONArray(raw)
            for (i in 0 until array.length()) out.add(Expense.fromJson(array.getJSONObject(i)))
        }
        return out
    }

    fun forMonth(monthKey: String): List<Expense> =
        all().filter { it.monthKey() == monthKey }
            .sortedWith(compareByDescending<Expense> { it.date }.thenByDescending { it.created })

    fun save(entry: Expense) {
        val items = all()
        val index = items.indexOfFirst { it.id == entry.id }
        if (index >= 0) items[index] = entry else items.add(entry)
        persist(items)
    }

    fun delete(id: String) = persist(all().filterNot { it.id == id }.toMutableList())

    fun clear() = persist(mutableListOf())

    fun find(id: String?): Expense? = id?.let { key -> all().firstOrNull { it.id == key } }

    fun months(): List<String> {
        val keys = all().map { it.monthKey() }.toMutableSet()
        keys.add(currentMonthKey())
        return keys.sortedDescending()
    }

    var budget: Double
        get() = prefs.getFloat(BUDGET_KEY, 0f).toDouble()
        set(value) = prefs.edit().putFloat(BUDGET_KEY, value.toFloat()).apply()

    var currency: String
        get() = prefs.getString(CURRENCY_KEY, "\u20B1") ?: "\u20B1"
        set(value) = prefs.edit().putString(CURRENCY_KEY, value).apply()

    private fun persist(items: MutableList<Expense>) {
        val array = JSONArray()
        items.forEach { array.put(it.toJson()) }
        prefs.edit().putString(ENTRIES_KEY, array.toString()).apply()
    }
}

fun currentMonthKey(): String {
    val now = Calendar.getInstance()
    return "%04d-%02d".format(now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1)
}

fun todayKey(): String {
    val now = Calendar.getInstance()
    return "%04d-%02d-%02d".format(
        now.get(Calendar.YEAR),
        now.get(Calendar.MONTH) + 1,
        now.get(Calendar.DAY_OF_MONTH)
    )
}

fun prettyMonth(monthKey: String): String {
    val parts = monthKey.split("-")
    val year = parts.getOrNull(0)?.toIntOrNull() ?: return monthKey
    val month = parts.getOrNull(1)?.toIntOrNull() ?: return monthKey
    val names = listOf(
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    )
    return "${names[(month - 1).coerceIn(0, 11)]} $year"
}

fun prettyDay(dayKey: String): String {
    if (dayKey == todayKey()) return "Today"
    val parts = dayKey.split("-").mapNotNull { it.toIntOrNull() }
    if (parts.size != 3) return dayKey
    val names = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    return "${names[(parts[1] - 1).coerceIn(0, 11)]} ${parts[2]}, ${parts[0]}"
}

fun money(currency: String, value: Double): String = currency + "%,.2f".format(value)

/** Merchant presets, mirroring the web build. */
val MERCHANTS: Map<String, List<String>> = mapOf(
    "food" to listOf("Jollibee", "McDonald's", "Chowking", "Mang Inasal", "Greenwich", "KFC",
        "Bonchon", "Shakey's", "Max's", "Goldilocks", "Red Ribbon", "Dunkin'", "Starbucks",
        "Angel's Pizza", "Army Navy", "Potato Corner", "Andok's", "Carinderia", "Milk tea"),
    "groceries" to listOf("SM Supermarket", "Puregold", "Savemore", "Robinsons", "Landers",
        "S&R", "WalterMart", "Alfamart", "7-Eleven", "Ministop", "Palengke", "Sari-sari store"),
    "transport" to listOf("Jeep", "Tricycle", "Bus", "LRT / MRT", "Grab", "Angkas", "JoyRide",
        "Taxi", "Gas", "Toll", "Parking", "P2P"),
    "bills" to listOf("Meralco", "Maynilad", "Manila Water", "Converge", "PLDT Home",
        "Globe At Home", "Sky Cable", "Rent", "Assoc. dues"),
    "load" to listOf("Globe", "Smart", "TNT", "DITO", "GOMO", "Load retailer"),
    "school" to listOf("Tuition", "Books", "School supplies", "Printing", "Uniform", "Project", "Baon"),
    "health" to listOf("Mercury Drug", "Watsons", "Southstar Drug", "Clinic", "Hospital",
        "Dentist", "Gym", "Vitamins"),
    "fun" to listOf("Netflix", "Spotify", "Steam", "YouTube Premium", "Cinema", "Concert",
        "Videoke", "Mobile game"),
    "other" to listOf("Gift", "Donation", "Padala", "Repair", "Pet", "Utang payment", "Savings")
)
