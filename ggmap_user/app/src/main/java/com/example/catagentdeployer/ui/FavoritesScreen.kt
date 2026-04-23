/**
 * ui/FavoritesScreen.kt — Danh sách địa điểm yêu thích
 * Tương đương FavoritesPage.jsx trên Web
 */

package com.example.catagentdeployer.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.catagentdeployer.network.Favorite

@Composable
fun FavoritesScreen(
    viewModel: MapViewModel,
    paddingValues: PaddingValues
) {
    val favorites by viewModel.favorites.collectAsState()
    val loading   by viewModel.loading.collectAsState()
    val toast     by viewModel.toast.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadFavorites()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(paddingValues)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // ── Header ──────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF1E293B))
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Text(
                    "❤️  Yêu thích",
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = Color.White
                )
            }

            // ── Content ──────────────────────────────────
            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF4285F4))
                }
            } else if (favorites.isEmpty()) {
                // Empty state
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.FavoriteBorder,
                            null,
                            tint = Color(0xFF334155),
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(Modifier.height(16.dp))
                        Text(
                            "Chưa có địa điểm yêu thích",
                            color = Color(0xFF64748B),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            "Tìm kiếm và lưu địa điểm\ntrên bản đồ nhé!",
                            color = Color(0xFF475569),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 8.dp),
                            lineHeight = 20.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(favorites, key = { it.id }) { fav ->
                        FavoriteCard(
                            favorite = fav,
                            onDelete = { viewModel.removeFavorite(fav.id) }
                        )
                    }
                }
            }
        }

        // ── Toast ────────────────────────────────────────
        AnimatedVisibility(
            visible = toast.isNotEmpty(),
            enter = fadeIn(), exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        ) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF323232))
            ) {
                Text(
                    toast,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                    fontSize = 14.sp
                )
            }
        }
    }
}

// ── Favorite Card ────────────────────────────────────────
@Composable
private fun FavoriteCard(
    favorite: Favorite,
    onDelete: () -> Unit
) {
    var showConfirm by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon box
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(Color(0xFF1D3461), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Favorite,
                    null,
                    tint = Color(0xFF4285F4),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    favorite.name,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 1
                )
                favorite.address?.let {
                    Text(
                        it,
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        maxLines = 2,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
                favorite.savedAt?.let { savedAt ->
                    val display = try { savedAt.take(10) } catch (_: Exception) { "" }
                    if (display.isNotEmpty())
                        Text(
                            "Đã lưu: $display",
                            color = Color(0xFF475569),
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                }
            }

            // Delete button
            IconButton(onClick = { showConfirm = true }) {
                Icon(
                    Icons.Default.Delete,
                    "Xóa",
                    tint = Color(0xFF64748B)
                )
            }
        }
    }

    // Confirm delete dialog
    if (showConfirm) {
        AlertDialog(
            onDismissRequest = { showConfirm = false },
            containerColor = Color(0xFF1E293B),
            title = {
                Text("Xóa yêu thích?", color = Color.White, fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "Bạn có chắc muốn xóa \"${favorite.name}\" khỏi danh sách yêu thích không?",
                    color = Color(0xFF94A3B8)
                )
            },
            confirmButton = {
                Button(
                    onClick = { showConfirm = false; onDelete() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Xóa", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirm = false }) {
                    Text("Hủy", color = Color(0xFF94A3B8))
                }
            }
        )
    }
}
