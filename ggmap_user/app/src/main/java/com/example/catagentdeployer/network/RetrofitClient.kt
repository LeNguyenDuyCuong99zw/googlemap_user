/**
 * network/RetrofitClient.kt — Singleton Retrofit instance
 * 
 * Cấu hình:
 * - Base URL của backend
 * - OkHttp interceptor để log request/response
 * - Gson converter
 */

package com.example.catagentdeployer.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    // ⚠️ Đổi thành URL Cloud Run khi deploy production
    // Local: http://10.0.2.2:3001 (emulator → localhost của máy)
    private const val BASE_URL = "http://10.0.2.2:3001/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY // Tắt NONE ở production
    }

    private val httpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(httpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
