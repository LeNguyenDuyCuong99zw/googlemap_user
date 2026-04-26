package com.example.catagentdeployer.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val VitalityColorScheme = darkColorScheme(
    primary = VitalityYellow,
    onPrimary = Color.Black,
    secondary = VitalityDarkGrey,
    onSecondary = Color.White,
    background = VitalityBlack,
    onBackground = Color.White,
    surface = VitalityDarkGrey,
    onSurface = Color.White,
    surfaceVariant = VitalityGlass,
    onSurfaceVariant = Color.White
)

@Composable
fun CatAgentDeployerTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = VitalityColorScheme,
        typography = Typography,
        content = content
    )
}
