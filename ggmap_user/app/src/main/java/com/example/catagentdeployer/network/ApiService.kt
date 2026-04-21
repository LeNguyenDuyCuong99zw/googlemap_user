/**
 * network/ApiService.kt — Retrofit interface gọi backend API
 * 
 * Định nghĩa tất cả endpoint của backend Node.js.
 * Retrofit sẽ tự sinh implementation khi build.
 */

package com.example.catagentdeployer.network

import retrofit2.Response
import retrofit2.http.*

// ── Data Models ───────────────────────────────────────

/** Một địa điểm từ backend */
data class Place(
    val placeId:  String,
    val name:     String,
    val address:  String?,
    val lat:      Double?,
    val lng:      Double?,
    val rating:   Double?,
    val isOpen:   Boolean?
)

/** Response danh sách địa điểm */
data class PlacesResponse(
    val places: List<Place>,
    val total:  Int
)

/** Thông tin chỉ đường */
data class DirectionDistance(val text: String, val value: Int)
data class DirectionsResponse(
    val distance:         DirectionDistance?,
    val duration:         DirectionDistance?,
    val startAddress:     String?,
    val endAddress:       String?,
    val overviewPolyline: String?
)

/** Địa điểm yêu thích */
data class Favorite(
    val id:      String,
    val placeId: String,
    val name:    String,
    val address: String?,
    val lat:     Double?,
    val lng:     Double?,
    val savedAt: String?
)

data class FavoritesResponse(val favorites: List<Favorite>, val total: Int)

/** Request body khi thêm yêu thích */
data class AddFavoriteRequest(
    val placeId: String,
    val name:    String,
    val address: String?,
    val lat:     Double?,
    val lng:     Double?
)

data class MessageResponse(val message: String)

// ── Retrofit Interface ────────────────────────────────

interface ApiService {

    /** Tìm địa điểm gần */
    @GET("places")
    suspend fun searchPlaces(
        @Header("Authorization") token: String,
        @Query("query")                 query: String,
        @Query("lat")                   lat: Double? = null,
        @Query("lng")                   lng: Double? = null
    ): Response<PlacesResponse>

    /** Lấy chỉ đường */
    @GET("places/route/directions")
    suspend fun getDirections(
        @Header("Authorization") token: String,
        @Query("origin")                origin: String,
        @Query("destination")           destination: String,
        @Query("mode")                  mode: String = "driving"
    ): Response<DirectionsResponse>

    /** Lấy danh sách yêu thích */
    @GET("favorites")
    suspend fun getFavorites(
        @Header("Authorization") token: String
    ): Response<FavoritesResponse>

    /** Thêm yêu thích */
    @POST("favorites")
    suspend fun addFavorite(
        @Header("Authorization") token: String,
        @Body                           body: AddFavoriteRequest
    ): Response<MessageResponse>

    /** Xóa yêu thích */
    @DELETE("favorites/{id}")
    suspend fun removeFavorite(
        @Header("Authorization") token: String,
        @Path("id")                     id: String
    ): Response<MessageResponse>
}
