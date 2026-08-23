package com.example.saannapunta

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View

/**
 * Slow, low-frame-rate black-and-orange blurred gradient, matching the house style.
 * Redraws roughly twice per second to stay cheap on battery.
 */
class GradientBackgroundView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val frameDelayMs = 500L
    private var phase = 0f

    private val ticker = object : Runnable {
        override fun run() {
            phase += 0.01f
            if (phase > 1f) phase -= 1f
            invalidate()
            postDelayed(this, frameDelayMs)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        post(ticker)
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(ticker)
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.parseColor("#0B0906"))

        val drift = Math.sin(phase * 2 * Math.PI).toFloat()
        val radius = maxOf(width, height) * 0.95f

        paint.shader = RadialGradient(
            width * (0.18f + drift * 0.08f),
            height * (0.06f + drift * 0.04f),
            radius,
            intArrayOf(Color.parseColor("#B3FF7E00"), Color.parseColor("#40E85D04"), Color.TRANSPARENT),
            floatArrayOf(0f, 0.35f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)

        paint.shader = RadialGradient(
            width * (0.86f - drift * 0.06f),
            height * (0.96f - drift * 0.05f),
            radius * 0.9f,
            intArrayOf(Color.parseColor("#8CF55B00"), Color.parseColor("#30B43700"), Color.TRANSPARENT),
            floatArrayOf(0f, 0.32f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
    }
}
