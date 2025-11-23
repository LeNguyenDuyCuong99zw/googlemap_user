# googlemap_user

## THÔNG TIN SINH VIÊN

- **Họ và tên:** Lê Nguyễn Duy Cường
- **MSSV:** 080205008616
- **Lớp:** CN2303B
- **Email:** duycuong9897@gmail.com

## ĐỀ TÀI BÁO CÁO

- **Tên đề tài:** obtaining the user’s current location (Chapter 7 - Android Permissions and Google Maps)

## THÔNG TIN SOURCE CODE

- **Package name:** `com.example.catagentdeployer`
- **Phiên bản:** `versionName = 1.0`, `versionCode = 1`
- **Android SDK:** `compileSdk = 36`, `targetSdk = 36`, `minSdk = 24`
- **Ngôn ngữ:** Kotlin, Jetpack Compose
- **Module chính:** `app`
- **Main activity:** `com.example.catagentdeployer.MainActivity`
- **Thư viện chính:**
  - `com.google.android.gms:play-services-maps:18.2.0`
  - Google Maps Compose (`google.maps.android.compose`)
  - Play Services Location (FusedLocationProvider)
  - AndroidX Compose, Material3
  - Secrets Gradle Plugin (quản lý `MAPS_API_KEY`)
- **Quyền yêu cầu:** `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`

## LINK GIT DỰ ÁN

- https://github.com/LeNguyenDuyCuong99zw/googlemap_user.git

## MÔ TẢ NGẮN GỌN

Ứng dụng là ví dụ đơn giản dùng Google Maps và Jetpack Compose. Ứng dụng:

- Yêu cầu quyền vị trí (fine/coarse) từ người dùng.
- Lấy vị trí hiện tại bằng `FusedLocationProvider` và di chuyển camera về vị trí đó.
- Cho phép người dùng chạm vào bản đồ để đặt một marker (tiêu đề: "Deploy Here").
- Sử dụng vector drawable (`res/drawable/target_icon.xml`) làm icon marker.
- Hiển thị nút lấy vị trí hiện tại và hiển thị toạ độ trong text của nút.

## CÁCH CÀI ĐẶT (BASIC INSTALL)

### Yêu cầu trước

- Android Studio (hoặc Gradle + Android SDK)
- JDK 11
- Android SDK Platform 36 và Google Play services
- Google Maps API Key (bật Maps SDK for Android; billing có thể cần thiết tùy dự án)

### Các bước

1. Clone repository:

```bash
git clone https://github.com/LeNguyenDuyCuong99zw/googlemap_user.git
cd googlemap_user
```

2. Thêm API key vào tệp cấu hình bí mật (dùng 1 trong 2 cách):

- Tạo tệp `secrets.properties` trong thư mục `ggmap_user` (module gốc) với dòng:

```properties
MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
```

- Hoặc chỉnh `local.defaults.properties` (đã có trong repo) và thêm:

```properties
MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
```

> Lưu ý: Không commit tệp chứa API key vào repository công khai.

3. Mở project bằng Android Studio: `Open` -> chọn thư mục `ggmap_user`.
4. Đồng bộ (Sync) Gradle để plugin secrets đọc API key.
5. Kết nối thiết bị Android hoặc chạy AVD, cấp quyền Location khi ứng dụng yêu cầu.
6. Chạy ứng dụng từ Android Studio hoặc dùng Gradle wrapper (PowerShell):

```powershell
cd "c:\Users\duycu\Downloads\tàilieu\googlemap_user-main\ggmap_user"
.\gradlew.bat assembleDebug
.\gradlew.bat installDebug
```

### Khắc phục sự cố thường gặp

- Nếu bản đồ hiển thị thông báo "For development purposes only" hoặc không load tiles: kiểm tra lại API key, bật Maps SDK for Android, và kiểm tra billing trên Google Cloud Console.
- Nếu không lấy được vị trí: kiểm tra permission runtime, trạng thái GPS/Network và đảm bảo thiết bị cấp quyền Location cho ứng dụng.

## FILE THAM KHẢO

- `app/src/main/AndroidManifest.xml` (permission, meta-data `MAPS_API_KEY`)
- `app/build.gradle.kts` (dependencies, plugin secrets)
- `app/src/main/java/com/example/catagentdeployer/MainActivity.kt` (logic quyền, lấy vị trí, bản đồ)

---

Nếu bạn muốn, mình có thể:

- Chuyển nội dung này sang tiếng Anh.
- Tạo `project_info.txt` hoặc cập nhật/commit file hộ bạn.
- Tạo một README tiếng Anh + tiếng Việt (song ngữ) và push lên remote.

Hãy cho mình biết bước tiếp theo bạn muốn làm.
