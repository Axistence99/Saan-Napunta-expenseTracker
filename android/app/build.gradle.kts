// Activates Android packaging and Kotlin compilation for the application module.
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Android-specific package, compatibility and compiler configuration.
android {
    // Package used for generated Android resources and BuildConfig classes.
    namespace = "com.example.saannapunta"

    // API level whose Android SDK symbols are available while compiling.
    compileSdk = 35

    // Values written into the APK manifest and used by stores during installation/update.
    defaultConfig {
        applicationId = "com.example.saannapunta"
        minSdk = 26      // Oldest Android version allowed to install the app.
        targetSdk = 35   // Android behavior level the application opts into.
        versionCode = 1  // Integer increased for every published update.
        versionName = "1.0" // Human-readable release version.
    }

    // Compile Java source and libraries against Java 17 language/bytecode rules.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // Make Kotlin emit JVM 17-compatible bytecode too.
    kotlinOptions {
        jvmTarget = "17"
    }
}

// Selects a Java 17 toolchain so local and CI builds use a consistent compiler runtime.
kotlin {
    jvmToolchain(17)
}
