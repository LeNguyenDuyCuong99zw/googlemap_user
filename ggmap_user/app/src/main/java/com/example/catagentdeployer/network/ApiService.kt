/**
 * network/ApiService.kt — Retrofit interface gọi backend API
 */

package com.example.catagentdeployer.network

import retrofit2.Response
import retrofit2.http.*

// ── Data Models ───────────────────────────────────────

data class Place(
    val placeId:  String,
    val name:     String,
    val address:  String?,
    val lat:      Double?,
    val lng:      Double?,
    val rating:   Double?,
    val isOpen:   Boolean?
)

data class PlacesResponse(val places: List<Place>, val total: Int)

data class DirectionDistance(val text: String, val value: Int)
data class DirectionsResponse(
    val distance:         DirectionDistance?,
    val duration:         DirectionDistance?,
    val startAddress:     String?,
    val endAddress:       String?,
    // AWS trả về list [[lng,lat], [lng,lat], ...]
    val geometry:         List<List<Double>>?
)

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

data class AddFavoriteRequest(
    val placeId: String,
    val name:    String,
    val address: String?,
    val lat:     Double?,
    val lng:     Double?
)

data class HistoryEntry(
    val id:        String?,
    val query:     String,
    val name:      String,
    val createdAt: String?
)

data class HistoryResponse(val history: List<HistoryEntry>, val total: Int)
data class SaveHistoryRequest(val query: String, val name: String)

data class MessageResponse(val message: String)

// ── Retrofit Interface ────────────────────────────────

interface ApiService {

    @GET("places")
    suspend fun searchPlaces(
        @Header("Authorization") token: String,
        @Query("query")                 query: String,
        @Query("lat")                   lat: Double? = null,
        @Query("lng")                   lng: Double? = null
    ): Response<PlacesResponse>

    @GET("places/route/directions")
    suspend fun getDirections(
        @Header("Authorization") token: String,
        @Query("origin")                origin: String,
        @Query("destination")           destination: String,
        @Query("mode")                  mode: String = "driving"
    ): Response<DirectionsResponse>

    @GET("favorites")
    suspend fun getFavorites(
        @Header("Authorization") token: String
    ): Response<FavoritesResponse>

    @POST("favorites")
    suspend fun addFavorite(
        @Header("Authorization") token: String,
        @Body                           body: AddFavoriteRequest
    ): Response<MessageResponse>

    @DELETE("favorites/{id}")
    suspend fun removeFavorite(
        @Header("Authorization") token: String,
        @Path("id")                     id: String
    ): Response<MessageResponse>

    @POST("history")
    suspend fun saveHistory(
        @Header("Authorization") token: String,
        @Body                           body: SaveHistoryRequest
    ): Response<MessageResponse>

    @GET("history")
    suspend fun getHistory(
        @Header("Authorization") token: String,
        @Query("limit")                 limit: Int = 20
    ): Response<HistoryResponse>

    @DELETE("history")
    suspend fun clearHistory(
        @Header("Authorization") token: String
    ): Response<MessageResponse>
}
