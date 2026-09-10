package com.example.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = FnbPrimary,
    onPrimary = FnbDarkBg,
    primaryContainer = FnbPrimaryBg,
    onPrimaryContainer = FnbPrimary,
    secondary = FnbGold,
    onSecondary = FnbDarkBg,
    secondaryContainer = FnbGoldBg,
    onSecondaryContainer = FnbGold,
    background = FnbDarkBg,
    onBackground = FnbTextPrimary,
    surface = FnbSurface,
    onSurface = FnbTextPrimary,
    surfaceVariant = FnbCard,
    onSurfaceVariant = FnbTextSecondary,
    outline = FnbBorder,
    error = FnbError,
    onError = FnbTextPrimary
)

@Composable
fun FirstNationalBankTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = DarkColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = FnbDarkBg.toArgb()
                window.navigationBarColor = FnbDarkBg.toArgb()
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = false
                insetsController.isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
