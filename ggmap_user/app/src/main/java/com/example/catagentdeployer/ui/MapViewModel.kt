/**
 * ui/MapViewModel.kt — Quản lý toàn bộ state và logic gọi API
 * Tương đương với useState + handler functions của MapPage.jsx trên Web
 */

package com.example.catagentdeployer.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.catagentdeployer.network.*
import com.google.android.gms.maps.model.LatLng
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class MapViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()

    // ── UI State ──────────────────────────────────────────
    private val _query        = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _origin       = MutableStateFlow("")
    val origin: StateFlow<String> = _origin.asStateFlow()

    private val _destination  = MutableStateFlow("")
    val destination: StateFlow<String> = _destination.asStateFlow()

    private val _activeTab    = MutableStateFlow("search") // "search" | "directions"
    val activeTab: StateFlow<String> = _activeTab.asStateFlow()

    private val _loading      = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _toast        = MutableStateFlow("")
    val toast: StateFlow<String> = _toast.asStateFlow()

    // ── Data State ────────────────────────────────────────
    private val _places          = MutableStateFlow<List<Place>>(emptyList())
    val places: StateFlow<List<Place>> = _places.asStateFlow()

    private val _selectedPlace   = MutableStateFlow<Place?>(null)
    val selectedPlace: StateFlow<Place?> = _selectedPlace.asStateFlow()

    private val _directions      = MutableStateFlow<DirectionsResponse?>(null)
    val directions: StateFlow<DirectionsResponse?> = _directions.asStateFlow()

    private val _polylinePoints  = MutableStateFlow<List<LatLng>>(emptyList())
    val polylinePoints: StateFlow<List<LatLng>> = _polylinePoints.asStateFlow()

    private val _favorites       = MutableStateFlow<List<Favorite>>(emptyList())
    val favorites: StateFlow<List<Favorite>> = _favorites.asStateFlow()

    private val _history         = MutableStateFlow<List<HistoryEntry>>(emptyList())
    val history: StateFlow<List<HistoryEntry>> = _history.asStateFlow()

    // ── Setters ───────────────────────────────────────────
    fun setQuery(q: String)       { _query.value = q }
    fun setOrigin(o: String)      { _origin.value = o }
    fun setDestination(d: String) { _destination.value = d }
    fun setActiveTab(t: String)   { _activeTab.value = t }
    fun selectPlace(p: Place?)    { _selectedPlace.value = p }
    fun clearPlaces()             { _places.value = emptyList() }
    fun clearDirections()         {
        _directions.value = null
        _polylinePoints.value = emptyList()
    }

    // ── Toast Helper ──────────────────────────────────────
    fun showToast(msg: String) {
        viewModelScope.launch {
            _toast.value = msg
            delay(3000)
            _toast.value = ""
        }
    }

    // ── Auth Token ────────────────────────────────────────
    private suspend fun getToken(): String {
        val user = auth.currentUser ?: return ""
        return try {
            "Bearer ${user.getIdToken(false).await().token}"
        } catch (e: Exception) { "" }
    }

    // ── Tìm kiếm địa điểm ────────────────────────────────
    fun searchPlaces() {
        if (_query.value.isBlank()) return
        viewModelScope.launch {
            _loading.value = true
            _directions.value = null
            _polylinePoints.value = emptyList()
            try {
                val token = getToken()
                val response = RetrofitClient.api.searchPlaces(token, _query.value)
                if (response.isSuccessful) {
                    val result = response.body()?.places ?: emptyList()
                    _places.value = result
                    if (result.isEmpty()) showToast("Không tìm thấy kết quả nào")
                    // Lưu lịch sử
                    try { RetrofitClient.api.saveHistory(token, SaveHistoryRequest(_query.value, _query.value)) } catch (_: Exception) {}
                } else {
                    showToast("Lỗi tìm kiếm (${response.code()})")
                }
            } catch (e: Exception) {
                showToast("Lỗi kết nối: ${e.message}")
            } finally {
                _loading.value = false
            }
        }
    }

    // ── Lấy chỉ đường ────────────────────────────────────
    fun getDirections() {
        if (_origin.value.isBlank() || _destination.value.isBlank()) return
        viewModelScope.launch {
            _loading.value = true
            _places.value = emptyList()
            try {
                val token = getToken()
                val response = RetrofitClient.api.getDirections(token, _origin.value, _destination.value)
                if (response.isSuccessful) {
                    val data = response.body()
                    _directions.value = data
                    // AWS trả về geometry: [[lng,lat], [lng,lat], ...]
                    // Cần đổi sang LatLng(lat, lng)
                    val points = data?.geometry
                        ?.filter { it.size >= 2 }
                        ?.map { coord -> LatLng(coord[1], coord[0]) }
                        ?: emptyList()
                    _polylinePoints.value = points
                    // Lưu lịch sử chỉ đường sang AWS Cloud
                    try { 
                        RetrofitClient.api.saveHistory(
                            token, 
                            SaveHistoryRequest("Route: ${_origin.value} to ${_destination.value}", "Directions to ${_destination.value}")
                        ) 
                    } catch (_: Exception) {}
                } else {
                    showToast("Lỗi chỉ đường (${response.code()})")
                }
            } catch (e: Exception) {
                showToast("Lỗi kết nối: ${e.message}")
            } finally {
                _loading.value = false
            }
        }
    }

    // ── Lưu yêu thích ────────────────────────────────────
    fun addFavorite(place: Place) {
        viewModelScope.launch {
            try {
                val token = getToken()
                val response = RetrofitClient.api.addFavorite(
                    token,
                    AddFavoriteRequest(place.placeId, place.name, place.address, place.lat, place.lng)
                )
                if (response.isSuccessful) {
                    showToast("✅ Đã lưu \"${place.name}\" vào yêu thích")
                } else {
                    showToast("Lỗi lưu yêu thích (${response.code()})")
                }
            } catch (e: Exception) {
                showToast("Lỗi kết nối: ${e.message}")
            }
        }
    }

    // ── Tải danh sách yêu thích ──────────────────────────
    fun loadFavorites() {
        viewModelScope.launch {
            _loading.value = true
            try {
                val token = getToken()
                val response = RetrofitClient.api.getFavorites(token)
                if (response.isSuccessful) {
                    _favorites.value = response.body()?.favorites ?: emptyList()
                }
            } catch (e: Exception) {
                showToast("Lỗi tải yêu thích: ${e.message}")
            } finally {
                _loading.value = false
            }
        }
    }

    // ── Xóa yêu thích ────────────────────────────────────
    fun removeFavorite(id: String) {
        viewModelScope.launch {
            try {
                val token = getToken()
                RetrofitClient.api.removeFavorite(token, id)
                _favorites.value = _favorites.value.filter { it.id != id }
                showToast("Đã xóa khỏi yêu thích")
            } catch (e: Exception) {
                showToast("Lỗi xóa yêu thích: ${e.message}")
            }
        }
    }
}
