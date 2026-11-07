#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <math.h>

// Điền thông tin Wi-Fi trước khi nạp chương trình vào ESP32.
const char* WIFI_SSID = "TEN_WIFI";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI";

const char* FEED_URL =
    "https://sensor-data-bridge-backend.onrender.com/api/v1/channels/1/feeds";
const char* WRITE_API_KEY =
    "sdb_write_K4HLKaMMiMZwENYxKR6q6jqszKSi2gpfKAHnhYXqsDs";

constexpr uint8_t DHT_PIN = 27;  // OUT -> GPIO27; V -> 3.3V; G -> GND.
constexpr uint8_t DHT_TYPE = DHT22;
constexpr unsigned long SEND_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_TIMEOUT_MS = 15000;

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastAttemptAt = 0;

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.print("Dang ket noi Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Khong ket noi duoc Wi-Fi; se thu lai.");
    return false;
  }

  Serial.print("Da ket noi Wi-Fi. IP: ");
  Serial.println(WiFi.localIP());
  return true;
}

void sendReading(float temperature, float humidity) {
  WiFiClientSecure client;
  // Bản thử nghiệm: HTTPS có mã hóa nhưng chưa xác minh chứng chỉ máy chủ.
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, FEED_URL)) {
    Serial.println("Khong khoi tao duoc ket noi HTTPS.");
    return;
  }

  http.setTimeout(30000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", WRITE_API_KEY);

  // Channel 1: field1 = nhiệt độ (°C), field2 = độ ẩm (%).
  const String body = "{\"field1\":" + String(temperature, 1) +
                      ",\"field2\":" + String(humidity, 1) + "}";
  const int statusCode = http.POST(body);

  if (statusCode == HTTP_CODE_CREATED) {
    Serial.printf("Gui thanh cong: %.1f C, %.1f %%\n", temperature, humidity);
  } else if (statusCode > 0) {
    Serial.printf("Backend tra ve HTTP %d: %s\n", statusCode,
                  http.getString().c_str());
  } else {
    Serial.printf("Loi ket noi HTTPS: %s\n",
                  http.errorToString(statusCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  lastAttemptAt = millis() - SEND_INTERVAL_MS;  // Gửi lần đầu ngay khi khởi động.
}

void loop() {
  if (millis() - lastAttemptAt < SEND_INTERVAL_MS) {
    delay(100);
    return;
  }
  lastAttemptAt = millis();

  if (!connectWiFi()) return;

  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Khong doc duoc DHT22; se thu lai sau 30 giay.");
    return;
  }

  sendReading(temperature, humidity);
}
