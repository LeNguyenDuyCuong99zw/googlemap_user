/**
 * ui/MapScreen.kt — Màn hình bản đồ chính
 * - Google Maps (mặc định) hoặc AWS MapLibre (toggle)
 * - Tìm kiếm + Chỉ đường qua Backend AWS Location Service
 */

package com.example.catagentdeployer.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.catagentdeployer.network.Favorite
import com.example.catagentdeployer.network.Place
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import kotlinx.coroutines.launch

private val HCMC = LatLng(10.7769, 106.7009)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    viewModel: MapViewModel,
    paddingValues: PaddingValues,
    userName: String,
    onLogout: () -> Unit
) {
    val places         by viewModel.places.collectAsState()
    val selectedPlace  by viewModel.selectedPlace.collectAsState()
    val directions     by viewModel.directions.collectAsState()
    val polylinePoints by viewModel.polylinePoints.collectAsState()
    val loading        by viewModel.loading.collectAsState()
    val toast          by viewModel.toast.collectAsState()
    val query          by viewModel.query.collectAsState()
    val origin         by viewModel.origin.collectAsState()
    val destination    by viewModel.destination.collectAsState()
    val activeTab      by viewModel.activeTab.collectAsState()

    val scope          = rememberCoroutineScope()
    val focusManager   = LocalFocusManager.current

    // Toggle: true = AWS Map (mặc định), false = Google Map
    var useAwsMap by remember { mutableStateOf(true) }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(HCMC, 13f)
    }

    var showControlSheet by remember { mutableStateOf(false) }
    var showPlaceSheet   by remember { mutableStateOf(false) }
    val controlSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val placeSheetState   = rememberModalBottomSheetState()

    // Auto-animate camera khi có kết quả tìm kiếm (chỉ khi đang dùng Google Map)
    LaunchedEffect(places, useAwsMap) {
        if (!useAwsMap && places.isNotEmpty()) {
            val first = places.first()
            if (first.lat != null && first.lng != null) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(LatLng(first.lat, first.lng), 14f)
                )
            }
        }
    }

    // Auto-animate camera khi có polyline (chỉ khi đang dùng Google Map)
    LaunchedEffect(polylinePoints, useAwsMap) {
        if (!useAwsMap && polylinePoints.isNotEmpty()) {
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngZoom(polylinePoints.first(), 11f)
            )
        }
    }

    // Auto-animate camera khi chọn địa điểm (chỉ khi đang dùng Google Map)
    LaunchedEffect(selectedPlace, useAwsMap) {
        if (!useAwsMap && selectedPlace != null && selectedPlace.lat != null && selectedPlace.lng != null) {
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngZoom(LatLng(selectedPlace.lat, selectedPlace.lng), 15f)
            )
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues)
    ) {
        // ── Map (Google hoặc AWS tuỳ toggle) ────────────
        if (useAwsMap) {
            // AWS MapLibre
            AwsMapView(
                modifier = Modifier.fillMaxSize(),
                places = places,
                selectedPlace = selectedPlace,
                polylinePoints = polylinePoints.map { it.latitude to it.longitude }
            )
        } else {
            // Google Map
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = true,
                    myLocationButtonEnabled = true,
                    compassEnabled = true
                ),
                properties = MapProperties(mapType = MapType.NORMAL),
                onMapClick = {
                    viewModel.selectPlace(null)
                    showPlaceSheet = false
                }
            ) {
                // Markers kết quả tìm kiếm
                places.forEach { place ->
                    if (place.lat != null && place.lng != null) {
                        Marker(
                            state = MarkerState(LatLng(place.lat, place.lng)),
                            title = place.name,
                            snippet = place.address ?: "",
                            onClick = {
                                viewModel.selectPlace(place)
                                showPlaceSheet = true
                                false
                            }
                        )
                    }
                }
                // Polyline chỉ đường
                if (polylinePoints.size > 1) {
                    Polyline(
                        points = polylinePoints,
                        color = Color(0xFF4285F4),
                        width = 10f
                    )
                    Marker(state = MarkerState(polylinePoints.first()), title = origin)
                    Marker(state = MarkerState(polylinePoints.last()), title = destination)
                }
            }
        }

        // ── Top Bar ──────────────────────────────────────
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 44.dp)
                .align(Alignment.TopCenter),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            elevation = CardDefaults.cardElevation(8.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Map, null,
                    tint = if (useAwsMap) Color(0xFFFF9900) else Color(0xFF4285F4),
                    modifier = Modifier.size(22.dp)
                )
                Spacer(Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        if (useAwsMap) "AWS Map" else "Google Map",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 16.sp
                    )
                    if (userName.isNotEmpty())
                        Text(userName, fontSize = 11.sp, color = Color(0xFF94A3B8), maxLines = 1)
                }

                // ── Nút toggle Google ↔ AWS ──────────
                Row(
                    modifier = Modifier
                        .background(Color(0xFF0F172A), RoundedCornerShape(20.dp))
                        .padding(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Google button
                    Box(
                        modifier = Modifier
                            .background(
                                if (!useAwsMap) Color(0xFF4285F4) else Color.Transparent,
                                RoundedCornerShape(18.dp)
                            )
                            .clickable { useAwsMap = false }
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("G", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    // AWS button
                    Box(
                        modifier = Modifier
                            .background(
                                if (useAwsMap) Color(0xFFFF9900) else Color.Transparent,
                                RoundedCornerShape(18.dp)
                            )
                            .clickable { useAwsMap = true }
                            .padding(horizontal = 10.dp, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("AWS", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(Modifier.width(4.dp))
                IconButton(onClick = { showControlSheet = true }) {
                    Icon(Icons.Default.Search, "Tìm kiếm", tint = Color(0xFF4285F4))
                }
                IconButton(onClick = onLogout) {
                    Icon(Icons.Default.Logout, "Thoát", tint = Color(0xFF94A3B8))
                }
            }
        }

        // ── Directions Result Card ────────────────────────
        directions?.let { dir ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp)
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 12.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    DirectionStatItem(
                        label = "Khoảng cách",
                        value = dir.distance?.text ?: "--",
                        icon = Icons.Default.Straighten
                    )
                    Spacer(Modifier.width(12.dp))
                    Divider(modifier = Modifier.height(40.dp).width(1.dp), color = Color(0xFF334155))
                    Spacer(Modifier.width(12.dp))
                    DirectionStatItem(
                        label = "Thời gian",
                        value = dir.duration?.text ?: "--",
                        icon = Icons.Default.Schedule
                    )
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = { viewModel.clearDirections() }) {
                        Icon(Icons.Default.Close, null, tint = Color(0xFF94A3B8))
                    }
                }
            }
        }

        // ── Toast ─────────────────────────────────────────
        AnimatedVisibility(
            visible = toast.isNotEmpty(),
            enter = fadeIn(), exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 80.dp)
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

        // ── Loading ───────────────────────────────────────
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = Color(0xFF4285F4)
            )
        }

        // ── FAB: Lấy vị trí hiện tại ───────────────────────
        if (!showControlSheet) {
            FloatingActionButton(
                onClick = { 
                    // Tạm thời mô phỏng vị trí hiện tại (có thể thay bằng FusedLocationProviderClient thực tế sau)
                    viewModel.showToast("Đang định vị vị trí hiện tại...")
                    if (!useAwsMap) {
                        scope.launch {
                            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(HCMC, 15f))
                        }
                    } else {
                        // Với AWS, do không truyền state trực tiếp ra ngoài, 
                        // ta cần reset selectedPlace để cập nhật camera (tạm thời)
                        viewModel.selectPlace(Place("myloc", "Vị trí hiện tại", "", HCMC.latitude, HCMC.longitude, null, null))
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = if (directions != null) 170.dp else 78.dp),
                containerColor = Color(0xFF1E293B),
                contentColor = Color(0xFF4285F4)
            ) {
                Icon(Icons.Default.MyLocation, "Vị trí hiện tại")
            }

            // ── FAB: Mở panel tìm kiếm ───────────────────────
            ExtendedFloatingActionButton(
                onClick = { showControlSheet = true },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp)
                    .padding(bottom = if (directions != null) 100.dp else 8.dp),
                containerColor = Color(0xFF4285F4),
                contentColor = Color.White,
                icon = { Icon(Icons.Default.Search, null) },
                text = { Text("Tìm kiếm", fontWeight = FontWeight.Medium) }
            )
        }
    }

    // ── Control Bottom Sheet (Search/Directions) ─────────
    if (showControlSheet) {
        ModalBottomSheet(
            onDismissRequest = { showControlSheet = false },
            sheetState = controlSheetState,
            containerColor = Color(0xFF1E293B),
            dragHandle = {
                Box(
                    modifier = Modifier
                        .padding(vertical = 12.dp)
                        .size(width = 40.dp, height = 4.dp)
                        .background(Color(0xFF334155), RoundedCornerShape(2.dp))
                )
            }
        ) {
            SearchDirectionsPanel(
                query = query,
                origin = origin,
                destination = destination,
                activeTab = activeTab,
                loading = loading,
                places = places,
                onQueryChange = viewModel::setQuery,
                onOriginChange = viewModel::setOrigin,
                onDestinationChange = viewModel::setDestination,
                onTabChange = viewModel::setActiveTab,
                onSearch = {
                    focusManager.clearFocus()
                    viewModel.searchPlaces()
                    // Crash fix: không gọi partialExpand vì sheetState đang set skipPartiallyExpanded = true
                    // scope.launch { controlSheetState.partialExpand() }
                },
                onGetDirections = {
                    focusManager.clearFocus()
                    viewModel.getDirections()
                    showControlSheet = false
                },
                onSelectPlace = {
                    viewModel.selectPlace(it)
                    showPlaceSheet = true
                },
                onClearPlaces = viewModel::clearPlaces
            )
        }
    }

    // ── Place Detail Bottom Sheet ─────────────────────────
    if (showPlaceSheet && selectedPlace != null) {
        ModalBottomSheet(
            onDismissRequest = {
                showPlaceSheet = false
                viewModel.selectPlace(null)
            },
            sheetState = placeSheetState,
            containerColor = Color(0xFF1E293B)
        ) {
            PlaceDetailsSheet(
                place = selectedPlace!!,
                onSaveFavorite = { viewModel.addFavorite(it) },
                onClose = {
                    showPlaceSheet = false
                    viewModel.selectPlace(null)
                }
            )
        }
    }
}

// ── Search / Directions Panel ────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchDirectionsPanel(
    query: String,
    origin: String,
    destination: String,
    activeTab: String,
    loading: Boolean,
    places: List<Place>,
    onQueryChange: (String) -> Unit,
    onOriginChange: (String) -> Unit,
    onDestinationChange: (String) -> Unit,
    onTabChange: (String) -> Unit,
    onSearch: () -> Unit,
    onGetDirections: () -> Unit,
    onSelectPlace: (Place) -> Unit,
    onClearPlaces: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .navigationBarsPadding()
    ) {
        // Tab switcher
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                .padding(4.dp)
        ) {
            listOf("search" to "🔍 Tìm kiếm", "directions" to "🧭 Chỉ đường").forEach { (tab, label) ->
                Button(
                    onClick = { onTabChange(tab) },
                    modifier = Modifier.weight(1f).height(40.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (activeTab == tab) Color(0xFF4285F4) else Color.Transparent,
                        contentColor = Color.White
                    ),
                    elevation = ButtonDefaults.buttonElevation(0.dp)
                ) {
                    Text(label, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        if (activeTab == "search") {
            // ── Search Tab ──
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Café, bệnh viện, ATM...", color = Color(0xFF94A3B8)) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = Color(0xFF4285F4)) },
                trailingIcon = {
                    if (query.isNotEmpty())
                        IconButton(onClick = { onQueryChange(""); onClearPlaces() }) {
                            Icon(Icons.Default.Clear, null, tint = Color(0xFF94A3B8))
                        }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSearch() }),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = searchFieldColors()
            )

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = onSearch,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                enabled = !loading && query.isNotBlank(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4285F4))
            ) {
                if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Tìm", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        } else {
            // ── Directions Tab ──
            OutlinedTextField(
                value = origin,
                onValueChange = onOriginChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Điểm xuất phát", color = Color(0xFF94A3B8)) },
                leadingIcon = { Icon(Icons.Default.MyLocation, null, tint = Color(0xFF34A853)) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = searchFieldColors()
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = destination,
                onValueChange = onDestinationChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Điểm đến", color = Color(0xFF94A3B8)) },
                leadingIcon = { Icon(Icons.Default.LocationOn, null, tint = Color(0xFFEA4335)) },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { onGetDirections() }),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = searchFieldColors()
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onGetDirections,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                enabled = !loading && origin.isNotBlank() && destination.isNotBlank(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4285F4))
            ) {
                if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                else { Icon(Icons.Default.Navigation, null); Spacer(Modifier.width(8.dp)); Text("Tìm đường", fontWeight = FontWeight.Bold, fontSize = 16.sp) }
            }
        }

        // Danh sách kết quả tìm kiếm
        if (places.isNotEmpty()) {
            Spacer(Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("${places.size} kết quả", color = Color(0xFF94A3B8), fontSize = 13.sp)
                TextButton(onClick = onClearPlaces) { Text("Xóa", color = Color(0xFF4285F4)) }
            }
            LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                items(places) { place ->
                    PlaceListItem(place = place, onClick = { onSelectPlace(place) })
                }
            }
        }

        Spacer(Modifier.height(12.dp))
    }
}

// ── Place List Item ──────────────────────────────────────
@Composable
private fun PlaceListItem(place: Place, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(Color(0xFF334155), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.LocationOn, null, tint = Color(0xFF4285F4), modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(place.name, color = Color.White, fontWeight = FontWeight.Medium, fontSize = 14.sp, maxLines = 1)
            place.address?.let {
                Text(it, color = Color(0xFF94A3B8), fontSize = 12.sp, maxLines = 1)
            }
            place.rating?.let {
                Text("⭐ $it", color = Color(0xFFFBBF24), fontSize = 11.sp)
            }
        }
        Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF334155))
    }
    Divider(color = Color(0xFF1E293B))
}

// ── Place Details Sheet ──────────────────────────────────
@Composable
fun PlaceDetailsSheet(
    place: Place,
    onSaveFavorite: (Place) -> Unit,
    onClose: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .navigationBarsPadding()
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(place.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                place.address?.let {
                    Text(it, color = Color(0xFF94A3B8), fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
            IconButton(onClick = onClose) {
                Icon(Icons.Default.Close, null, tint = Color(0xFF94A3B8))
            }
        }

        if (place.rating != null || place.isOpen != null) {
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                place.rating?.let {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Star, null, tint = Color(0xFFFBBF24), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("$it", color = Color(0xFFFBBF24), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
                place.isOpen?.let { open ->
                    Text(
                        if (open) "🟢 Đang mở cửa" else "🔴 Đã đóng cửa",
                        color = if (open) Color(0xFF34A853) else Color(0xFFEA4335),
                        fontSize = 13.sp, fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        Button(
            onClick = { onSaveFavorite(place) },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4285F4))
        ) {
            Icon(Icons.Default.FavoriteBorder, null)
            Spacer(Modifier.width(8.dp))
            Text("Lưu yêu thích", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }

        Spacer(Modifier.height(16.dp))
    }
}

// ── Direction Stat Item ───────────────────────────────────
@Composable
private fun DirectionStatItem(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, tint = Color(0xFF4285F4), modifier = Modifier.size(18.dp))
        Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(label, color = Color(0xFF94A3B8), fontSize = 11.sp)
    }
}

// ── Shared TextField Colors ───────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun searchFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Color(0xFF4285F4),
    unfocusedBorderColor = Color(0xFF334155),
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedLabelColor = Color(0xFF4285F4),
    unfocusedLabelColor = Color(0xFF94A3B8),
    cursorColor = Color(0xFF4285F4),
    focusedContainerColor = Color(0xFF0F172A),
    unfocusedContainerColor = Color(0xFF0F172A)
)
