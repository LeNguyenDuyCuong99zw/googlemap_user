# ============================================================

# README DEPLOY — Hướng dẫn triển khai lên Google Cloud

# ============================================================

## YÊU CẦU TRƯỚC KHI DEPLOY

- [X] Google Cloud account có billing enabled
- [X] `gcloud` CLI đã cài và đăng nhập
- [X] Docker Desktop (để build image local, tùy chọn)
- [X] Firebase project đã tạo
- [X] Google Maps API key đã tạo

---

## BƯỚC 0 — Chuẩn bị Google Cloud Project

```bash
# Đăng nhập
gcloud auth login

# Tạo project mới (hoặc dùng project có sẵn)
gcloud projects create ggmap-app-2024 --name="GGMap Application"

# Set project active
gcloud config set project ggmap-app-2024

# Bật các API cần thiết
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com

echo "✅ APIs enabled"
```

---

## BƯỚC 1 — Tạo Firestore Database

```bash
# Tạo Firestore database (chọn region gần nhất)
gcloud firestore databases create \
  --location=asia-southeast1 \
  --type=firestore-native

echo "✅ Firestore created in asia-southeast1 (Singapore)"
```

**Trong Firebase Console**, bật Firestore và tạo rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User chỉ đọc/ghi data của chính họ
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## BƯỚC 2 — Lưu Secrets vào Secret Manager

```bash
# Lưu Google Maps API Key
echo -n "YOUR_ACTUAL_MAPS_API_KEY" | \
  gcloud secrets create GOOGLE_MAPS_API_KEY \
  --data-file=-

# Lưu Firebase Private Key (download service account JSON trước)
# Sau đó extract các field cần thiết:
gcloud secrets create FIREBASE_PRIVATE_KEY \
  --data-file=-  <<< "$(cat service-account.json | python3 -c "import json,sys; print(json.load(sys.stdin)['private_key'])")"

# Tạo secret cho toàn bộ Firebase config
gcloud secrets create FIREBASE_CONFIG \
  --data-file=service-account.json

echo "✅ Secrets stored"
```

---

## BƯỚC 3 — Deploy Backend lên Cloud Run

### Cách 1: Dùng Cloud Build (Recommended)

```bash
cd backend/

# Deploy trực tiếp từ source (không cần Dockerfile local)
gcloud run deploy ggmap-backend \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3001 \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id \
  --set-env-vars FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com \
  --set-secrets GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest \
  --set-secrets FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest
```

### Cách 2: Build Docker image thủ công

```bash
cd backend/

# Build image
docker build -t gcr.io/ggmap-app-2024/ggmap-backend:v1 .

# Push lên Container Registry
docker push gcr.io/ggmap-app-2024/ggmap-backend:v1

# Deploy
gcloud run deploy ggmap-backend \
  --image gcr.io/ggmap-app-2024/ggmap-backend:v1 \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 3001
```

Sau khi deploy xong, lấy URL:

```bash
gcloud run services describe ggmap-backend \
  --region asia-southeast1 \
  --format="value(status.url)"
# Output: https://ggmap-backend-xxxxx-as.a.run.app
```

---

## BƯỚC 4 — Cấu hình Environment Variables

Sau khi có Cloud Run URL, cập nhật:

**Web** (`web/.env.local`):

```
VITE_API_BASE_URL=https://ggmap-backend-xxxxx-as.a.run.app
```

**Android** (`RetrofitClient.kt`):

```kotlin
private const val BASE_URL = "https://ggmap-backend-xxxxx-as.a.run.app/"
```

**Backend CORS** — thêm Web URL vào ALLOWED_ORIGINS trong Cloud Run env vars.

---

## BƯỚC 5 — Test Deploy

```bash
# Health check
curl https://ggmap-backend-xxxxx-as.a.run.app/health

# Expected response:
# {"status":"ok","service":"ggmap-backend","timestamp":"..."}
```

---

## BƯỚC 6 — Deploy Web (Firebase Hosting)

```bash
cd web/

# Build production
npm run build

# Cài Firebase CLI nếu chưa có
npm install -g firebase-tools
firebase login

# Init hosting
firebase init hosting
# → chọn "dist" làm public directory
# → single-page app: Yes

# Deploy
firebase deploy --only hosting
# Output: https://ggmap-app-2024.web.app
```

---

## BƯỚC 7 — Cấu hình Firebase Authentication

Trong **Firebase Console**:

1. Authentication → Sign-in method
2. Bật **Google** provider
3. Bật **Email/Password** provider
4. Authorized domains → thêm domain web của bạn

---

## CẤU TRÚC CHI PHÍ GOOGLE CLOUD (FREE TIER)

| Dịch vụ        | Free Tier          | Ghi chú        |
| ---------------- | ------------------ | --------------- |
| Cloud Run        | 2M req/tháng      | Đủ cho demo   |
| Firestore        | 50K read/ngày     | Đủ cho dev    |
| Maps Platform    | $200 credit/tháng | Khoảng 28K req |
| Firebase Auth    | 10K users free     |                 |
| Firebase Hosting | 10GB/tháng        |                 |

**→ Demo + dev hoàn toàn miễn phí!**

---

## TROUBLESHOOTING

### Backend không start

```bash
# Xem logs
gcloud run services logs read ggmap-backend --region asia-southeast1
```

### Firebase Admin errorv  

C:\gg-map\googlemap_user\backend>node test_aws.js
🚀 Đang thử gọi API của bạn...
✅ Thành công! Phản hồi từ Lambda: {
  message: 'Cloud Log saved successfully to DynamoDB',
  logId: '1776972324053_embxcu8'
}

C:\gg-map\googlemap_user\backend>

- Kiểm tra FIREBASE_PRIVATE_KEY có đúng format (có `\n`) không
- Kiểm tra service account có quyền Firestore Editor không

### CORS error từ Web

- Kiểm tra ALLOWED_ORIGINS trong env vars Cloud Run
- Thêm domain web đúng format (có https://)

### Google Maps không load

- Kiểm tra API key đã bật đúng APIs chưa:
  - Maps JavaScript API
  - Places API
  - Directions API
  - Maps SDK for Android
