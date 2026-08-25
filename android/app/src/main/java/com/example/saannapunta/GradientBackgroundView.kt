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

    // Reused Paint avoids allocating a new drawing object on every frame.
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    // Two frames per second are enough for slow ambient motion and reduce battery use.
    private val frameDelayMs = 500L

    // Normalized 0..1 animation position used to calculate the gradient drift.
    private var phase = 0f

    // Self-scheduling task advances the phase, redraws, then queues the next frame.
    private val ticker = object : Runnable {
        override fun run() {
            phase += 0.01f
            if (phase > 1f) phase -= 1f
            invalidate()
            postDelayed(this, frameDelayMs)
        }
    }

    /** Starts animation only while the custom view is attached to a visible window. */
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        post(ticker)
    }

    /** Cancels queued frames when the screen leaves to avoid leaks and background work. */
    override fun onDetachedFromWindow() {
        removeCallbacks(ticker)
        super.onDetachedFromWindow()
    }

    /** Paints the black base followed by drifting purple and orange radial gradients. */
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.parseColor("#07050B"))

        // A sine wave produces smooth back-and-forth movement instead of a hard reset.
        val drift = Math.sin(phase * 2 * Math.PI).toFloat()
        val radius = maxOf(width, height) * 0.95f

        // Cool purple light drifts around the upper-left area.
        paint.shader = RadialGradient(
            width * (0.18f + drift * 0.08f),
            height * (0.06f + drift * 0.04f),
            radius,
            intArrayOf(Color.parseColor("#9E8B5CF6"), Color.parseColor("#404C1D95"), Color.TRANSPARENT),
            floatArrayOf(0f, 0.35f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)

        // Warm orange/gold light counterbalances it near the lower-right area.
        paint.shader = RadialGradient(
            width * (0.86f - drift * 0.06f),
            height * (0.96f - drift * 0.05f),
            radius * 0.9f,
            intArrayOf(Color.parseColor("#99FF7E00"), Color.parseColor("#38E9C46A"), Color.TRANSPARENT),
            floatArrayOf(0f, 0.32f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
    }
}
