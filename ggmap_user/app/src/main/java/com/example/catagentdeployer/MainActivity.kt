/**
 * MainActivity.kt — Entry point của ứng dụng
 *
 * Luồng:
 *  - Check Firebase auth → LoginScreen hoặc MainApp
 *  - MainApp: Bottom Navigation giữa MapScreen và FavoritesScreen
 */

package com.example.catagentdeployer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.example.catagentdeployer.ui.*
import com.example.catagentdeployer.ui.theme.CatAgentDeployerTheme
import com.google.firebase.auth.FirebaseAuth

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CatAgentDeployerTheme {
                GGMapApp()
            }
        }
    }
}

@Composable
fun GGMapApp() {
    val auth = FirebaseAuth.getInstance()
    var isLoggedIn by remember { mutableStateOf(auth.currentUser != null) }

    if (!isLoggedIn) {
        LoginScreen(onLoginSuccess = { isLoggedIn = true })
    } else {
        val mapViewModel: MapViewModel = viewModel()
        MainApp(
            viewModel = mapViewModel,
            userName = auth.currentUser?.displayName ?: auth.currentUser?.email ?: "",
            onLogout = {
                auth.signOut()
                isLoggedIn = false
            }
        )
    }
}

// ── Bottom Navigation Setup ───────────────────────────────
private sealed class Screen(
    val route: String,
    val label: String,
    val selectedIcon: androidx.compose.ui.graphics.vector.ImageVector,
    val unselectedIcon: androidx.compose.ui.graphics.vector.ImageVector
) {
    object Map : Screen("map", "Bản đồ", Icons.Filled.Map, Icons.Outlined.Map)
    object Favorites : Screen("favorites", "Yêu thích", Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainApp(
    viewModel: MapViewModel,
    userName: String,
    onLogout: () -> Unit
) {
    val navController = rememberNavController()
    val screens = listOf(Screen.Map, Screen.Favorites)
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        containerColor = Color.Black,
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF050505),
                tonalElevation = 0.dp
            ) {
                screens.forEach { screen ->
                    val selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                    NavigationBarItem(
                        icon = {
                            Icon(
                                if (selected) screen.selectedIcon else screen.unselectedIcon,
                                contentDescription = screen.label
                            )
                        },
                        label = {
                            Text(
                                screen.label,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                            )
                        },
                        selected = selected,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Color(0xFFEAFF00),
                            selectedTextColor = Color(0xFFEAFF00),
                            unselectedIconColor = Color.White.copy(alpha = 0.4f),
                            unselectedTextColor = Color.White.copy(alpha = 0.4f),
                            indicatorColor = Color(0xFF1A1A1A)
                        )
                    )
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Map.route,
            modifier = Modifier.fillMaxSize()
        ) {
            composable(Screen.Map.route) {
                MapScreen(
                    viewModel = viewModel,
                    paddingValues = paddingValues,
                    userName = userName,
                    onLogout = onLogout
                )
            }
            composable(Screen.Favorites.route) {
                FavoritesScreen(
                    viewModel = viewModel,
                    paddingValues = paddingValues
                )
            }
        }
    }
}
