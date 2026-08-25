import org.gradle.api.initialization.resolve.RepositoriesMode

// Repositories Gradle may use to resolve build plugins before any module is configured.
pluginManagement {
    repositories {
        google()             // Android Gradle Plugin and Google tooling.
        mavenCentral()       // Kotlin and general JVM artifacts.
        gradlePluginPortal() // Community Gradle plugins.
    }
}

// Central dependency repositories shared by every module in this Android project.
dependencyResolutionManagement {
    // Prevents individual modules from silently adding different repositories.
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

// Name shown by Gradle and Android Studio, plus the one application module to build.
rootProject.name = "SaanNapuntaAndroid"
include(":app")
