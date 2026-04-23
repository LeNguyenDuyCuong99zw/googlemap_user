/**
 * ui/AwsMapView.kt — Hiển thị bản đồ AWS Location Service qua MapLibre
 */
package com.example.catagentdeployer.ui

import android.content.Context
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.catagentdeployer.network.Place
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style

// Thông tin AWS
private const val AWS_REGION = "ap-southeast-1"
private const val AWS_MAP_NAME = "webappmap-map"
private const val AWS_API_KEY = "v1.public.eyJqdGkiOiI2NjFjMjYyYy01MmI3LTQxZDAtODE5Yy1iOWE2ZDdhYTUwNmUifQOcSMbQMtPh2tOYZX3DXZj3FVmMCni0-G5Qa5wY4L7VUDXyURH23RCIcf5w3NiyhZaBp1Xfz6qtk9XAL9-zkqPZgWPWFixFtIROsbdLRaMMihB_J1Paa3SZx0hpZexVU9MLPh0kaZss1IrW6O5q6pzfUEbTfQ6cXGU7Qo_2GOCLXWMHsiVqL0D1YfDV8_ZK9lBQ_pQ9mluZwtPCe9FDlq8KXFaB2LbQnSaoohRx62q-ZhNboIlJj64RCdJs4Q11OOiA8kBTz5WujnyVOdZYtuXLAjQ9Yywme8Bh1MkC43zTcBJRZq_47UL74j9op8kZHOVm43tF7KsX0MY60e5TgU8.MzRjYzZmZGUtZmY3NC00NDZiLWJiMTktNTc4YjUxYTFlOGZi"

private val AWS_STYLE_URL =
    "https://maps.geo.$AWS_REGION.amazonaws.com/maps/v0/maps/$AWS_MAP_NAME/style-descriptor?key=$AWS_API_KEY"

@Composable
fun AwsMapView(
    modifier: Modifier = Modifier,
    centerLat: Double = 10.7769,
    centerLng: Double = 106.7009,
    zoom: Double = 13.0,
    places: List<Place> = emptyList(),
    selectedPlace: Place? = null,
    polylinePoints: List<Pair<Double, Double>> = emptyList()
) {
    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { context: Context ->
            // Khởi tạo MapLibre
            MapLibre.getInstance(context)

            MapView(context).apply {
                getMapAsync { map ->
                    map.setStyle(Style.Builder().fromUri(AWS_STYLE_URL)) { style ->
                        // Style loaded
                    }
                    map.cameraPosition = CameraPosition.Builder()
                        .target(LatLng(centerLat, centerLng))
                        .zoom(zoom)
                        .build()

                    map.addOnMapClickListener { _ -> false }
                }
                onStart()
            }
        },
        update = { mapView ->
            mapView.getMapAsync { map ->
                // Nếu có selectedPlace, zoom tới đó (ưu tiên cao nhất)
                if (selectedPlace != null && selectedPlace.lat != null && selectedPlace.lng != null) {
                    map.cameraPosition = CameraPosition.Builder()
                        .target(LatLng(selectedPlace.lat, selectedPlace.lng))
                        .zoom(15.0)
                        .build()
                }
                // Nếu không có selectedPlace nhưng có danh sách places, zoom vào điểm đầu
                else if (places.isNotEmpty()) {
                    val first = places.first()
                    if (first.lat != null && first.lng != null) {
                        map.cameraPosition = CameraPosition.Builder()
                            .target(LatLng(first.lat, first.lng))
                            .zoom(14.0)
                            .build()
                    }
                }
                
                // Nếu có polyline (chỉ đường), zoom vào điểm đầu
                if (polylinePoints.isNotEmpty()) {
                    val (lat, lng) = polylinePoints.first()
                    map.cameraPosition = CameraPosition.Builder()
                        .target(LatLng(lat, lng))
                        .zoom(11.0)
                        .build()
                }
            }
        }
    )
}
