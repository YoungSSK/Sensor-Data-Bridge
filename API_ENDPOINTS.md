# TÀI LIỆU TOÀN DIỆN CÁC API ENDPOINTS
**Dự án:** Sensor Data Bridge (Hệ thống Thu thập, Quản lý & Cầu nối Dữ liệu IoT)  
**Phiên bản API:** v1  
**Ngày cập nhật:** 10/11/2026  

---

## MỤC LỤC
1. [Tổng quan & Phương thức Xác thực](#1-tổng-quan--phương-thức-xác-thực)
2. [Bảng tổng hợp tất cả các API Endpoints](#2-bảng-tổng-hợp-tất-cả-các-api-endpoints)
3. [Chi tiết từng nhóm Endpoint](#3-chi-tiết-từng-nhóm-endpoint)
   - [3.1. Hệ thống & Kiểm tra sức khỏe (Root & Health)](#31-hệ-thống--kiểm-tra-sức-khỏe-root--health)
   - [3.2. Xác thực & Tài khoản người dùng (Auth)](#32-xác-thực--tài-khoản-người-dùng-auth)
   - [3.3. Mô hình Channel & Feeds (ThingSpeak-style)](#33-mô-hình-channel--feeds-thingspeak-style)
   - [3.4. Quản lý Dự án (Projects)](#34-quản-lý-dự-án-projects)
   - [3.5. Quản lý Thiết bị (Devices)](#35-quản-lý-thiết-bị-devices)
   - [3.6. Thu nạp dữ liệu Telemetry chuẩn V1 (Device Ingestion)](#36-thu-nạp-dữ-liệu-telemetry-chuẩn-v1-device-ingestion)
   - [3.7. Cảm biến thô Legacy (Sensors)](#37-cảm-biến-thô-legacy-sensors)
4. [Hướng dẫn tích hợp cho Web/Ứng dụng bên ngoài](#4-hướng-dẫn-tích-hợp-cho-webứng-dụng-bên-ngoài)

---

## 1. TỔNG QUAN & PHƯƠNG THỨC XÁC THỰC

### Base URL:
* **Local Development:** `http://localhost:8000/api/v1`
* **Production (Render):** `https://sensor-data-bridge.onrender.com/api/v1`
* **Interactive API Docs:**
  * Swagger UI: `{BASE_URL}/docs`
  * ReDoc: `{BASE_URL}/redoc`

### Chuẩn hóa Thời gian (Timezone):
* **Toàn bộ thời gian trả về từ API (`received_at`, `latest_received_at`, `created_at`...) đều được chuẩn hóa theo múi giờ Việt Nam (UTC+7)** kèm offset `+07:00` theo chuẩn ISO 8601 (ví dụ: `2026-11-10T16:50:00+07:00`).
* Website bên thứ ba nhận dữ liệu sẽ thấy ngay giờ địa phương chính xác mà không cần cộng trừ giờ thủ công.

### Các cơ chế xác thực hỗ trợ:
1. **Public (Không cần Auth):** Dành cho kiểm tra server, đăng ký/đăng nhập và endpoint sensor legacy.
2. **Bearer JWT Token (`Authorization: Bearer <JWT>`):** Dành cho phiên người dùng quản trị (Frontend Dashboard, quản lý Projects, Channels, Devices).
3. **Channel API Key (`X-API-Key: <16_CHAR_KEY>`):** Dành riêng cho Channel.
   * `Write API Key`: Dành cho ESP32 đẩy số đo lên kênh.
   * `Read API Key`: Dành cho **website khác hoặc ứng dụng bên ngoài** đọc dữ liệu đo mà không cần đăng nhập tài khoản.
4. **Device Token (`X-Device-Token: <TOKEN>`):** Dành cho thiết bị IoT cấp doanh nghiệp kết nối vào endpoint `/telemetry`.

---

## 2. BẢNG TỔNG HỢP TẤT CẢ CÁC API ENDPOINTS

| Nhóm | Phương thức | Đường dẫn Endpoint | Cơ chế Xác thực | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/` | Public | Thông tin chào mừng và đường dẫn docs |
| **System** | `GET` | `/api/v1/health` | Public | Kiểm tra trạng thái hoạt động backend |
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Đăng ký tài khoản người dùng mới |
| **Auth** | `POST` | `/api/v1/auth/login` | Public | Đăng nhập lấy Bearer JWT Token |
| **Auth** | `GET` | `/api/v1/auth/me` | Bearer JWT | Lấy hồ sơ tài khoản đang đăng nhập |
| **Channels** | `GET` | `/api/v1/channels` | Bearer JWT | Danh sách kênh thuộc sở hữu của user |
| **Channels** | `POST` | `/api/v1/channels` | Bearer JWT | Tạo kênh mới kèm cấu hình các Field |
| **Channels** | `GET` | `/api/v1/channels/{id}` | Bearer JWT | Xem thông tin chi tiết của kênh |
| **Channels** | `PATCH` | `/api/v1/channels/{id}` | Bearer JWT | Cập nhật tên, mô tả hoặc field của kênh |
| **Channels** | `PUT` | `/api/v1/channels/{id}/fields` | Bearer JWT | Cấu hình/thay thế danh sách các field |
| **Channels** | `DELETE` | `/api/v1/channels/{id}` | Bearer JWT | Xóa hoàn toàn một kênh |
| **Channels** | `GET` | `/api/v1/channels/{id}/api_keys` | Bearer JWT | Xem danh sách các API Key của kênh |
| **Channels** | `POST` | `/api/v1/channels/{id}/api_keys` | Bearer JWT | Tạo khóa Write Key hoặc Read Key mới (16 ký tự) |
| **Channels** | `DELETE` | `/api/v1/channels/{id}/api_keys/{key_id}` | Bearer JWT | Thu hồi (hủy) API Key |
| **Channels** | `POST` | `/api/v1/channels/{id}/feeds` | **X-API-Key (Write)** | **ESP32 gửi số đo các field lên kênh** |
| **Channels** | `GET` | `/api/v1/channels/{id}/feeds` | **X-API-Key (Read)** / JWT | **Web ngoài lấy dữ liệu phân trang & lọc thời gian linh hoạt** |
| **Channels** | `GET` | `/api/v1/channels/{id}/feeds/range` | **X-API-Key (Read)** / JWT | **Chuyên biệt: Lọc theo ngày bắt đầu/kết thúc & giờ bắt đầu/kết thúc** |
| **Channels** | `GET` | `/api/v1/channels/{id}/private_show` | Bearer JWT | Lấy trọn bộ metadata + feeds phục vụ Dashboard đồ họa |
| **Projects** | `GET` | `/api/v1/projects` | Bearer JWT | Danh sách các Project của user |
| **Projects** | `POST` | `/api/v1/projects` | Bearer JWT | Tạo Project quản lý thiết bị mới |
| **Projects** | `GET` | `/api/v1/projects/{id}` | Bearer JWT | Lấy chi tiết một Project |
| **Projects** | `PATCH`| `/api/v1/projects/{id}` | Bearer JWT | Đổi tên, mô tả của Project |
| **Projects** | `GET` | `/api/v1/projects/{id}/devices` | Bearer JWT | Danh sách thiết bị nằm trong Project |
| **Projects** | `POST` | `/api/v1/projects/{id}/devices` | Bearer JWT | Khởi tạo thiết bị mới kèm Device Token |
| **Devices** | `GET` | `/api/v1/devices/{id}` | Bearer JWT | Xem chi tiết thông số thiết bị |
| **Devices** | `PATCH`| `/api/v1/devices/{id}` | Bearer JWT | Cập nhật cấu hình thiết bị (chu kỳ đo...) |
| **Devices** | `GET` | `/api/v1/devices/{id}/tokens` | Bearer JWT | Xem danh sách token của thiết bị |
| **Devices** | `POST` | `/api/v1/devices/{id}/tokens` | Bearer JWT | Cấp phát thêm token cho thiết bị |
| **Devices** | `DELETE`| `/api/v1/devices/{id}/tokens/{token_id}` | Bearer JWT | Thu hồi token của thiết bị |
| **Devices** | `GET` | `/api/v1/devices/{id}/latest` | Bearer JWT | Lấy 1 bản ghi telemetry mới nhất của thiết bị |
| **Devices** | `GET` | `/api/v1/devices/{id}/telemetry` | Bearer JWT | Lịch sử đo đạc telemetry của thiết bị |
| **Telemetry**| `POST` | `/api/v1/telemetry` | **X-Device-Token** | **ESP32 gửi Telemetry chuẩn hóa V1** |
| **Sensors** | `POST` | `/api/v1/sensors/readings` | Public | Đẩy số đo cảm biến đơn lẻ (Legacy) |
| **Sensors** | `GET` | `/api/v1/sensors/readings` | Public | Đọc danh sách số đo cảm biến (Legacy) |
| **Sensors** | `GET` | `/api/v1/sensors/readings/{sensor_id}` | Public | Lọc số đo cảm biến theo ID (Legacy) |

---

## 3. CHI TIẾT TỪNG NHÓM ENDPOINT

### 3.1. Hệ thống & Kiểm tra sức khỏe (Root & Health)

#### `GET /api/v1/health`
* **Mục đích:** Health check phục vụ giám sát uptime (UptimeRobot, Render Health Check).
* **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-10T08:45:00Z",
    "version": "1.0.0"
  }
  ```

---

### 3.2. Xác thực & Tài khoản người dùng (Auth)

#### `POST /api/v1/auth/register`
* **Request Body:**
  ```json
  {
    "email": "user@gmail.com",
    "password": "Password123!",
    "full_name": "Nguyễn Văn A"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@gmail.com",
      "full_name": "Nguyễn Văn A",
      "role": "user",
      "status": "active"
    }
  }
  ```

#### `POST /api/v1/auth/login`
* **Request Body:**
  ```json
  {
    "email": "user@gmail.com",
    "password": "Password123!"
  }
  ```

#### `GET /api/v1/auth/me`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`

---

### 3.3. Mô hình Channel & Feeds (ThingSpeak-style)

#### 1. Tạo khóa API Key: `POST /api/v1/channels/{channel_id}/api_keys`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`
* **Request Body:**
  ```json
  {
    "type": "read", // Hoặc "write"
    "name": "Khóa xem dữ liệu cho Website đối tác"
  }
  ```
* **Response (201 Created):** Khóa `api_key` gồm 16 ký tự an toàn chỉ hiển thị 1 lần.

---

#### 2. ESP32 Gửi dữ liệu lên Channel: `POST /api/v1/channels/{channel_id}/feeds`
* **Headers:** `X-API-Key: <16_CHAR_WRITE_KEY>`
* **Request Body (Hỗ trợ định dạng `field1..field8` hoặc JSON Object):**
  ```json
  {
    "field1": 33.2,
    "field2": 67.0,
    "field3": 32.0,
    "field4": 0.0,
    "field5": 14.0,
    "field6": 58.5,
    "field7": 4095.0,
    "field8": 296.0
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "id": 105,
    "channel_id": 1,
    "values": {
      "field1": 33.2,
      "field2": 67.0,
      "field3": 32.0,
      "field4": 0.0,
      "field5": 14.0,
      "field6": 58.5,
      "field7": 4095.0,
      "field8": 296.0
    },
    "received_at": "2026-11-10T08:45:10Z"
  }
  ```

---

#### 3. Web khác hoặc Client lấy dữ liệu: `GET /api/v1/channels/{channel_id}/feeds`
* **Headers:** `X-API-Key: <16_CHAR_READ_KEY>` *(hoặc `Authorization: Bearer <JWT>`)*
* **Query Parameters:**
  * `page` (int, default: `1`): Số trang cần xem.
  * `page_size` (int, default: `20`, max: `100`): Số dòng mỗi trang.
  * `limit` (int, 1–1000, optional): Lấy nhanh N dòng mới nhất.
  * `start_at` / `end_at` (ISO Datetime, optional): Mốc thời gian ISO (ví dụ: `2026-11-01T00:00:00Z`).
  * `start_date` / `end_date` (string `YYYY-MM-DD`, optional): Ngày bắt đầu / kết thúc.
  * `start_time` / `end_time` (string `HH:MM` hoặc `HH:MM:SS`, optional): Giờ bắt đầu / kết thúc.
  * `tz` (string, default: `+07:00`): Múi giờ địa phương (ví dụ `+07:00` Việt Nam hoặc `UTC`).
  * `order` (`desc` hoặc `asc`, default: `desc`): `desc` là dữ liệu mới nhất ở đầu.

---

#### 4. Endpoint Chuyên biệt Lọc theo Ngày & Giờ: `GET /api/v1/channels/{channel_id}/feeds/range`
Endpoint thiết kế riêng cho web bên thứ ba truy vấn theo khung ngày giờ trực quan:
* **Headers:** `X-API-Key: <16_CHAR_READ_KEY>` *(hoặc `Authorization: Bearer <JWT>`)*
* **Query Parameters bắt buộc:**
  * `start_date` (string, **bắt buộc**): Ngày bắt đầu, định dạng `YYYY-MM-DD` (Ví dụ: `2026-11-08`).
  * `end_date` (string, **bắt buộc**): Ngày kết thúc, định dạng `YYYY-MM-DD` (Ví dụ: `2026-11-10`).
* **Query Parameters tùy chọn:**
  * `start_time` (string, mặc định: `00:00:00`): Giờ bắt đầu (`HH:MM` hoặc `HH:MM:SS`, ví dụ: `08:30`).
  * `end_time` (string, mặc định: `23:59:59`): Giờ kết thúc (`HH:MM` hoặc `HH:MM:SS`, ví dụ: `17:45`).
  * `tz` (string, mặc định: `+07:00`): Múi giờ địa phương (Hệ thống tự động quy đổi về UTC chính xác).
  * `page` (int, mặc định: `1`): Số trang.
  * `page_size` (int, mặc định: `20`, tối đa: `100`): Số dòng mỗi trang.
  * `limit` (int, 1–1000, optional): Lấy nhanh N dòng gần nhất trong khoảng thời gian.
  * `order` (`desc` hoặc `asc`, mặc định: `desc`): Sắp xếp mới nhất trước hoặc cũ nhất trước.

* **Response (200 OK):**
  ```json
  {
    "channel_id": 1,
    "total": 142,
    "page": 1,
    "page_size": 20,
    "total_pages": 8,
    "feeds": [
      {
        "id": 520,
        "channel_id": 1,
        "values": {
          "field1": 33.2,
          "field2": 67.0,
          "field3": 32.0,
          "field4": 0.0,
          "field5": 14.0,
          "field6": 58.5,
          "field7": 4095.0,
          "field8": 296.0
        },
        "received_at": "2026-11-08T16:15:20+07:00"
      }
    ]
  }
  ```

---

#### 5. Xem dữ liệu toàn diện kênh: `GET /api/v1/channels/{channel_id}/private_show`
* **Headers:** `Authorization: Bearer <JWT_TOKEN>`
* **Query Parameters:** `limit` (default: 100)
* **Response (200 OK):** Bao gồm thông tin đầy đủ về Kênh, cấu hình các Field, tổng số bản ghi và các feed gần nhất để dựng biểu đồ.

---

### 3.4. Quản lý Dự án (Projects)
* `GET /api/v1/projects`: Danh sách các dự án kèm số lượng thiết bị (`devices_count`).
* `POST /api/v1/projects`: Tạo dự án mới.
* `GET /api/v1/projects/{project_id}`: Xem chi tiết dự án.
* `GET /api/v1/projects/{project_id}/devices`: Danh sách thiết bị thuộc dự án.
* `POST /api/v1/projects/{project_id}/devices`: Tạo thiết bị trong dự án và sinh mã token đầu tiên.

---

### 3.5. Quản lý Thiết bị (Devices)
* `GET /api/v1/devices/{device_id}`: Thông tin chi tiết thiết bị, trạng thái `last_seen_at`.
* `PATCH /api/v1/devices/{device_id}`: Cập nhật thông số chu kỳ gửi (`interval_seconds`), tên thiết bị.
* `GET /api/v1/devices/{device_id}/latest`: Lấy **1 bản ghi telemetry mới nhất** của thiết bị (kèm `uptime_ms`, `firmware_version`, chỉ số chất lượng cảm biến `quality`).
* `GET /api/v1/devices/{device_id}/telemetry?limit=50`: Lịch sử dữ liệu đo đạc của thiết bị.

---

### 3.6. Thu nạp dữ liệu Telemetry chuẩn V1 (Device Ingestion)

#### `POST /api/v1/telemetry`
* **Headers:** `X-Device-Token: <DEVICE_TOKEN>`
* **Mục đích:** Giao thức chuẩn hóa dành cho thiết bị công nghiệp (có xác thực chữ ký/token, chống trùng lặp bản ghi `message_id`, quản lý chất lượng truyền tin).
* **Request Body:**
  ```json
  {
    "v": 1,
    "msg_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "device_code": "ESP32_AGRI_01",
    "metrics_rev": 1,
    "calib_rev": 1,
    "firmware": "1.0.4",
    "uptime_ms": 1284500,
    "time": {
      "measured_at": "2026-11-10T08:44:00Z",
      "quality": "synced"
    },
    "values": {
      "temperature": 32.5,
      "humidity": 68.2,
      "soil_moisture": 45.1
    },
    "quality": {
      "temperature": "good",
      "humidity": "good",
      "soil_moisture": "good"
    }
  }
  ```
* **Response:**
  * `201 Created`: Bản ghi mới được lưu trữ thành công.
  * `200 OK`: Bản ghi lặp (idempotent retry - đã nhận trước đó).

---

### 3.7. Cảm biến thô Legacy (Sensors)
* `POST /api/v1/sensors/readings`: Nhận bản ghi dạng `{ "sensor_id": "temp_01", "value": 28.5, "unit": "C" }`.
* `GET /api/v1/sensors/readings?limit=50`: Lấy danh sách số đo legacy.
* `GET /api/v1/sensors/readings/{sensor_id}?limit=50`: Lọc theo mã cảm biến.

---

## 4. HƯỚNG DẪN TÍCH HỢP CHO WEB/ỨNG DỤNG BÊN NGOÀI

### Ví dụ 1: Web bên thứ ba gọi lấy dữ liệu theo ngày & giờ (JavaScript / Fetch)
```javascript
const CHANNEL_ID = 1;
const READ_API_KEY = "kU7xP2wL9mQ4vN8j"; // 16 ký tự Read API Key do bạn cung cấp

// Truy vấn từ 08:00 ngày 08/11/2026 đến 17:30 ngày 10/11/2026 (Múi giờ Việt Nam +07:00)
async function loadFeedsByRange() {
  const params = new URLSearchParams({
    start_date: "2026-11-08",
    start_time: "08:00",
    end_date: "2026-11-10",
    end_time: "17:30",
    tz: "+07:00",
    page: "1",
    page_size: "20",
    order: "desc"
  });

  try {
    const url = `https://sensor-data-bridge.onrender.com/api/v1/channels/${CHANNEL_ID}/feeds/range?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": READ_API_KEY,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Lỗi kết nối: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Tìm thấy tổng cộng ${data.total} bản ghi (Trang ${data.page}/${data.total_pages})`);
    console.log("Danh sách đo đạc:", data.feeds);
  } catch (error) {
    console.error("Không thể lấy dữ liệu:", error);
  }
}
```

### Ví dụ 2: Web bên thứ ba gọi bằng Python (Requests)
```python
import requests

CHANNEL_ID = 1
READ_API_KEY = "kU7xP2wL9mQ4vN8j"

url = f"https://sensor-data-bridge.onrender.com/api/v1/channels/{CHANNEL_ID}/feeds/range"
headers = {"X-API-Key": READ_API_KEY}
params = {
    "start_date": "2026-11-08",
    "start_time": "08:00",
    "end_date": "2026-11-10",
    "end_time": "17:30",
    "tz": "+07:00",
    "page": 1,
    "page_size": 20
}

response = requests.get(url, headers=headers, params=params)
if response.status_code == 200:
    data = response.json()
    print(f"Tổng số bản ghi: {data['total']}")
    print(data['feeds'])
else:
    print(f"Lỗi: {response.status_code} - {response.text}")
```

### Ví dụ 3: Lấy dữ liệu bằng cURL theo khoảng ngày giờ
```bash
curl -X GET "https://sensor-data-bridge.onrender.com/api/v1/channels/1/feeds/range?start_date=2026-11-08&start_time=08:00&end_date=2026-11-10&end_time=18:00&tz=+07:00&page=1&page_size=50" \
     -H "X-API-Key: kU7xP2wL9mQ4vN8j" \
     -H "Accept: application/json"
```

### Ví dụ 4: Lấy nhanh 20 dòng mới nhất
```bash
curl -X GET "https://sensor-data-bridge.onrender.com/api/v1/channels/1/feeds?limit=20" \
     -H "X-API-Key: kU7xP2wL9mQ4vN8j" \
     -H "Accept: application/json"
```

### Ví dụ 5: ESP32 gửi dữ liệu lên kênh (C++ / Arduino)
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "https://sensor-data-bridge.onrender.com/api/v1/channels/1/feeds";
const char* writeKey = "wA3kP8mN5vL1xR9q"; // 16 ký tự Write Key

void postSensorData(float temp, float hum, float soil) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", writeKey);

    String body = "{\"field1\":" + String(temp, 1) + 
                  ",\"field2\":" + String(hum, 1) + 
                  ",\"field3\":" + String(soil, 1) + "}";

    int code = http.POST(body);
    Serial.printf("POST Code: %d\n", code);
    http.end();
  }
}
```

---

## 5. BẢNG MÃ LỖI HTTP & CÁCH XỬ LÝ (ERROR HANDLING)

| Mã HTTP | Tên lỗi | Nguyên nhân phổ biến | Hướng khắc phục |
| :---: | :--- | :--- | :--- |
| **`200`** | OK | Yêu cầu truy vấn thành công | Dữ liệu trả về đầy đủ trong mảng `feeds`. |
| **`201`** | Created | Thêm bản ghi mới thành công | Dữ liệu đã được lưu trữ vào MySQL Aiven. |
| **`400`** | Bad Request | Dữ liệu yêu cầu không hợp lệ | Kiểm tra lại email hoặc thông tin gửi lên. |
| **`401`** | Unauthorized | Thiếu header `X-API-Key` hoặc JWT token hết hạn | Kiểm tra lại khóa 16 ký tự trong header. |
| **`403`** | Forbidden | Dùng nhầm Write Key để đọc dữ liệu (hoặc ngược lại) | Cung cấp đúng **Read API Key** cho web đọc dữ liệu. |
| **`404`** | Not Found | `channel_id` không tồn tại | Kiểm tra lại số ID kênh trong đường dẫn URL. |
| **`422`** | Unprocessable | Sai định dạng ngày (`YYYY-MM-DD`), giờ (`HH:MM`) hoặc `start > end` | Chuẩn hóa định dạng thời gian trước khi gọi. |
| **`500`** | Internal Error| Lỗi hệ thống server hoặc cơ sở dữ liệu Aiven | Thử lại sau ít phút hoặc kiểm tra backend logs. |

