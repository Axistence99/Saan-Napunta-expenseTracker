// Root build script: declares plugin versions once for all Android modules.
plugins {
    // Android application build tools. `apply false` defers activation to the app module.
    id("com.android.application") version "8.5.2" apply false

    // Kotlin compiler and Android integration used by the native source files.
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
