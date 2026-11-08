
/*
  DỰ ÁN: IOT GIÁM SÁT MÔI TRƯỜNG VÀ DINH DƯỠNG CHO CÂY ỚT
  PHẦN CỨNG: ESP32 DevKit V1 30 chân + mạch mở rộng 30P
  CHẾ ĐỘ: CẢM BIẾN THỰC TẾ, HIỂN THỊ SERIAL MONITOR 115200

  SƠ ĐỒ ĐẤU DÂY (jumper mạch mở rộng để 3.3V):
  - DHT22:      + -> D27-V, OUT -> D27-S, - -> D27-G
  - HD-38:      + -> D34-V, AO -> D34-S, - -> D34-G, DO bỏ trống
  - DS18B20:    VCC -> D26-V, DAT -> D26-S, GND -> D26-G
                 Mạch chuyển DS18B20 đã có điện trở kéo lên 4.7k:
                 KHÔNG cần lắp thêm.
  - TDS V1.0:   + -> D32-V, A -> D32-S, - -> D32-G
  - PH-4502C:   V+ -> nguồn 5V RIÊNG trên board mở rộng,
                 G -> D35-G; TO và DO bỏ trống.
                 PO -> R1 10k -> D35-S; D35-S -> R2 10k -> GND.
                 KHÔNG nối trực tiếp PO vào GPIO35.
  - DHT22:      Module đã có điện trở kéo lên SMD; KHÔNG cần lắp thêm.

  CẦN CÀI ĐẶT:
  - DHT sensor library for ESPx (DHTesp)
  - OneWire
  - DallasTemperature
  - Board 'esp32 by Espressif Systems'.

  QUAN TRỌNG:
  - HD-38: Phần trăm độ ẩm là GIÁ TRỊ ƯỚC LƯỢNG cho đến khi hiệu chuẩn ADC đất khô/ướt.
  - pH: Chỉ có số đo khi đã hiệu chuẩn bằng dung dịch đệm pH 7 và pH 4.
  - TDS: Giá trị ppm là ƯỚC LƯỢNG theo mô hình Gravity; cần hiệu chuẩn bằng dung dịch chuẩn.
  - Không tự động tính pH khi chưa hiệu chuẩn; luôn hiển thị ADC và điện áp PO.
  - Nguồn: Jumper mạch mở rộng V-3.3V, pH cấp 5V từ cụm nguồn riêng.
  - TDS đo chất rắn hòa tan trong nước/dung dịch, KHÔNG đo N/P/K trực tiếp.
*/

#include <Arduino.h>
#include <DHTesp.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
// =============== 1. KHAI BÁO GPIO ===============
constexpr uint8_t PIN_DHT22   = 27;
constexpr uint8_t PIN_DS18B20 = 26;
constexpr uint8_t PIN_SOIL    = 34;
constexpr uint8_t PIN_PH      = 35;
constexpr uint8_t PIN_TDS     = 32;

constexpr unsigned long BAUD_RATE = 115200;
constexpr unsigned long READ_INTERVAL_MS = 2500; // DHT22 đọc cách nhau >= 2 giây

// =============== WIFI CONFIGURATION ===============

const char* WIFI_SSID = "Nha Tro 116";
const char* WIFI_PASSWORD = "0932650165";

// =============== SENSOR DATA BRIDGE CONFIGURATION ===============
// Channel 1 cần cấu hình field1 ... field8 và một Write API Key còn hiệu lực.
const char* FEED_URL =
    "https://sensor-data-bridge-backend.onrender.com/api/v1/channels/1/feeds";
const char* WRITE_API_KEY = "sdb_write_K4HLKaMMiMZwENYxKR6q6jqszKSi2gpfKAHnhYXqsDs";

constexpr unsigned long BACKEND_INTERVAL_MS = 20000;
unsigned long lastBackendUpload = 0;
// =============== 2. THÔNG SỐ HIỆU CHUẨN ===============
// HD-38: Đây là giá trị ADC VÍ DỤ; thay bằng giá trị ADC đo được của bạn.
constexpr int SOIL_ADC_DRY = 3400;  // Giá trị ADC khi đất khô
constexpr int SOIL_ADC_WET = 1400;  // Giá trị ADC khi đất ướt
constexpr bool SOIL_CALIBRATED = false; // Đổi thành true khi đã đo đất khô/ướt

// Bộ chia áp PH-4502C: PO -- R1 10k -- GPIO35 -- R2 10k -- GND.
// Điện áp trên PO = điện áp tại GPIO35 x (R1+R2)/R2 = x2.
constexpr float PH_R1_OHM = 10000.0f; // PO -> R1 -> GPIO35
constexpr float PH_R2_OHM = 10000.0f; // GPIO35 -> R2 -> GND
constexpr float PH_VOLTAGE_FACTOR = (PH_R1_OHM + PH_R2_OHM) / PH_R2_OHM; // = 2.0

// Hai giá trị điện áp PO gốc (đơn vị V) khi nhúng điện cực vào dung dịch đệm pH 7 và pH 4.
// Mặc định hiệu chuẩn theo Nernst lý thuyết (pH 7 -> 2.500V, pH 4.01 -> 2.677V).
// Có thể thay bằng số thực tế đo từ dung dịch đệm khi cần độ chính xác cao hơn.
constexpr float PH_VOLT_AT_7 = 2.500f;
constexpr float PH_VOLT_AT_4 = 2.677f;

// TDS: Hệ số kinh nghiệm; cần hiệu chuẩn bằng dung dịch TDS chuẩn.
constexpr float TDS_CALIBRATION_FACTOR = 1.0f;

// Chỉ bật true nếu DS18B20 đo CÙNG nước/dung dịch với đầu dò TDS.
// Nếu DS18B20 đang cắm trong đất, giữ false (TDS mặc định 25 độ C).
constexpr bool TDS_USE_DS18B20_TEMPERATURE = false;

DHTesp dht;
OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);

struct AnalogReading {
  uint16_t raw;
  float pinVoltage; // Điện áp tại chân ESP32 (đã qua mạch chia áp nếu là pH)
};

// Lấy giá trị trung bình để giảm nhiễu ADC.
// analogReadMilliVolts trả về điện áp đã được hiệu chuẩn.
AnalogReading readAnalog(uint8_t pin, int sampleCount = 20) {
  uint32_t rawSum = 0;
  uint32_t mVSum = 0;
  for (int i = 0; i < sampleCount; ++i) {
    rawSum += analogRead(pin);
    mVSum += analogReadMilliVolts(pin);
    delay(3);
  }
  AnalogReading r;
  r.raw = (uint16_t)(rawSum / sampleCount);
  r.pinVoltage = (mVSum / (float)sampleCount) / 1000.0f;
  return r;
}

float soilPercentFromRaw(int raw) {
  if (SOIL_ADC_DRY == SOIL_ADC_WET) return NAN;
  float percent = 100.0f * (SOIL_ADC_DRY - raw) /
                  (float)(SOIL_ADC_DRY - SOIL_ADC_WET);
  if (percent < 0.0f) return 0.0f;
  if (percent > 100.0f) return 100.0f;
  return percent;
}

float calculatePH(float originalPOVoltage) {
  if (PH_VOLT_AT_7 < 0.0f || PH_VOLT_AT_4 < 0.0f ||
      fabsf(PH_VOLT_AT_4 - PH_VOLT_AT_7) < 0.01f) {
    return NAN; // Chưa hiệu chuẩn
  }
  // Nội suy tuyến tính theo hai điểm pH 7 và pH 4.
  float ph = 7.0f + (originalPOVoltage - PH_VOLT_AT_7) *
                (4.01f - 7.0f) / (PH_VOLT_AT_4 - PH_VOLT_AT_7);
  if (ph < 0.0f) ph = 0.0f;
  if (ph > 14.0f) ph = 14.0f;
  return ph;
}

// Đánh giá môi trường đất/nước từ khoảng pH và điện áp đo được
const char* getPHEnvironment(float ph) {
  if (isnan(ph)) return "Chưa hiệu chuẩn";
  if (ph < 5.5f)  return "AXIT MẠNH (Đất chua, hại rễ ớt)";
  if (ph < 6.0f)  return "AXIT (Hơi chua)";
  if (ph <= 6.8f) return "AXIT NHẸ (Tối ưu cho cây ớt)";
  if (ph <= 7.2f) return "TRUNG TÍNH";
  if (ph <= 8.0f) return "KIỀM NHẸ";
  return "KIỀM MẠNH (Cảnh báo thiếu vi lượng)";
}

float calculateTDS(float voltage, float temperatureC) {
  // Công thức gần đúng cho TDS Meter V1.0 / Gravity Analog TDS.
  const float coefficient = 1.0f + 0.02f * (temperatureC - 25.0f);
  const float v = voltage / coefficient;
  const float ppm = (133.42f * v * v * v - 255.86f * v * v +
                     857.39f * v) * 0.5f * TDS_CALIBRATION_FACTOR;
  return (ppm > 0.0f) ? ppm : 0.0f;
}
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println();
  Serial.println("Dang ket noi Wi-Fi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startAttempt < 20000) {
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("Wi-Fi ket noi thanh cong!");
    Serial.print("IP ESP32: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println("Khong the ket noi Wi-Fi!");
  }
}
void appendField(String& body, const char* key, const String& value) {
  if (body.length() > 1) body += ',';
  body += '"';
  body += key;
  body += "\":";
  body += value;
}

void uploadToBackend(
  TempAndHumidity air,
  bool airOK,
  float probeC,
  bool probeOK,
  float soilPercent,
  uint16_t soilADC,
  float phValue,
  uint16_t phADC,
  float tdsPpm
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi mat ket noi, dang thu ket noi lai...");
    connectWiFi();
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Khong gui duoc du lieu!");
    return;
  }

  String body = "{";
  if (airOK) {
    appendField(body, "field1", String(air.temperature, 1));
    appendField(body, "field2", String(air.humidity, 1));
  }
  if (probeOK) appendField(body, "field3", String(probeC, 2));
  if (isfinite(soilPercent)) appendField(body, "field4", String(soilPercent, 1));
  if (isfinite(phValue)) appendField(body, "field5", String(phValue, 2));
  if (isfinite(tdsPpm)) appendField(body, "field6", String(tdsPpm, 1));
  appendField(body, "field7", String(soilADC));
  appendField(body, "field8", String(phADC));
  body += '}';

  WiFiClientSecure client;
  // Giống sketch DHT hiện tại: mã hóa HTTPS nhưng chưa xác minh chứng chỉ máy chủ.
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, FEED_URL)) {
    Serial.println("BACKEND: Khong khoi tao duoc HTTPS.");
    return;
  }
  http.setTimeout(60000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", WRITE_API_KEY);

  const int response = http.POST(body);
  if (response == HTTP_CODE_CREATED) {
    Serial.println("BACKEND: GUI DU LIEU THANH CONG!");
  } else if (response > 0) {
    Serial.printf("BACKEND: HTTP %d: %s\n", response, http.getString().c_str());
  } else {
    Serial.printf("BACKEND: LOI KET NOI HTTPS: %s\n",
                  http.errorToString(response).c_str());
  }
  http.end();
}
void setup() {
  Serial.begin(BAUD_RATE);
  delay(1200);

  analogReadResolution(12); // ADC từ 0 đến 4095
  pinMode(PIN_SOIL, INPUT);
  pinMode(PIN_PH, INPUT);
  pinMode(PIN_TDS, INPUT);

  analogSetPinAttenuation(PIN_SOIL, ADC_11db);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  analogSetPinAttenuation(PIN_TDS, ADC_11db);

  dht.setup(PIN_DHT22, DHTesp::DHT22);
  ds18b20.begin();
  ds18b20.setResolution(12);

  Serial.println();
  Serial.println("====================================================");
  Serial.println("   HỆ THỐNG IOT GIÁM SÁT MÔI TRƯỜNG CHO CÂY ỚT");
  Serial.println("   ESP32 DevKit V1 - CẢM BIẾN THỰC TẾ - 115200 baud");
  Serial.println("====================================================");
  Serial.println("DHT22: GPIO27 | DS18B20: GPIO26 | HD-38: GPIO34");
  Serial.println("TDS: GPIO32  | pH: GPIO35 (PHẢI QUA CHIA ÁP 10k/10k)");
  Serial.printf("Số cảm biến DS18B20 tìm thấy: %d\n", ds18b20.getDeviceCount());
  Serial.println("Đã xác nhận: DHT22 và DS18B20 có điện trở kéo lên trên module.");
  Serial.println("Jumper: V-3.3V; pH: nguồn 5V riêng + chia áp 10k/10k.");
  Serial.println("Cần hiệu chuẩn HD-38, pH và TDS trước khi sử dụng định lượng.");

  // Ket noi Wi-Fi
  connectWiFi();

  Serial.println("Backend: sensor-data-bridge-backend.onrender.com");
  Serial.println("Channel ID: 1");
}

void loop() {
  // (1) DHT22: Nhiệt độ và độ ẩm không khí
  TempAndHumidity air = dht.getTempAndHumidity();
  const bool airOK = !isnan(air.temperature) && !isnan(air.humidity) && (dht.getStatus() == DHTesp::ERROR_NONE);

  // (2) DS18B20: Nhiệt độ đầu dò (đất hoặc nước)
  ds18b20.requestTemperatures();
  float probeC = ds18b20.getTempCByIndex(0);
  const bool probeOK = probeC != DEVICE_DISCONNECTED_C &&
                       !isnan(probeC) && probeC >= -55.0f && probeC <= 125.0f;

  // (3) HD-38; (4) pH PH-4502C; (5) TDS V1.0
  AnalogReading soil = readAnalog(PIN_SOIL);
  AnalogReading ph   = readAnalog(PIN_PH);
  AnalogReading tds  = readAnalog(PIN_TDS);

  const float soilPercent = soilPercentFromRaw(soil.raw);
  const float phModuleVoltage = ph.pinVoltage * PH_VOLTAGE_FACTOR;
  const float phValue = calculatePH(phModuleVoltage);

  float tdsTemperature = 25.0f;
  if (TDS_USE_DS18B20_TEMPERATURE && probeOK) {
    tdsTemperature = probeC;
  }
  const float tdsPpm = calculateTDS(tds.pinVoltage, tdsTemperature);

  Serial.println();
  Serial.println("----------------- DỮ LIỆU CẢM BIẾN -----------------");

  Serial.print("1. DHT22     | ");
  if (airOK) {
    Serial.printf("Nhiệt độ không khí: %.1f C | Độ ẩm không khí: %.1f %%\n",
                  air.temperature, air.humidity);
  } else {
    Serial.print("LỖI: ");
    Serial.println(dht.getStatusString());
  }

  Serial.print("2. DS18B20   | ");
  if (probeOK) {
    Serial.printf("Nhiệt độ đầu dò: %.2f C\n", probeC);
  } else {
    Serial.println("LỖI: Không nhận được DS18B20. Kiểm tra dây DATA, nguồn, GND và mạch chuyển.");
  }

  Serial.printf("3. HD-38     | ADC: %u | Điện áp: %.3f V",
                soil.raw, soil.pinVoltage);
  if (!isnan(soilPercent)) {
    Serial.printf(" | Độ ẩm đất: %.1f %% (%s)", soilPercent,
                  SOIL_CALIBRATED ? "Đã hiệu chuẩn" : "ƯỚC LƯỢNG, chưa hiệu chuẩn");
  }
  Serial.println();

  Serial.printf("4. pH        | ADC: %u | Điện áp GPIO35: %.3f V | PO: %.3f V",
                ph.raw, ph.pinVoltage, phModuleVoltage);
  if (isnan(phValue)) {
    Serial.println(" | pH: CHƯA HIỆU CHUẨN (dung dịch đệm pH 7 và pH 4)");
  } else {
    Serial.printf(" | pH: %.2f | Môi trường: %s\n", phValue, getPHEnvironment(phValue));
  }

  Serial.printf("5. TDS       | ADC: %u | Điện áp: %.3f V | %.1f ppm (ƯỚC LƯỢNG, chưa hiệu chuẩn)\n",
                tds.raw, tds.pinVoltage, tdsPpm);
  Serial.printf("   Bù nhiệt TDS: %.1f C (%s)\n", tdsTemperature,
                TDS_USE_DS18B20_TEMPERATURE ? "DS18B20 nếu hợp lệ" : "Mặc định");

  if (soil.raw >= 4080 || ph.raw >= 4080 || tds.raw >= 4080) {
    Serial.println("CẢNH BÁO: ADC gần mức tối đa, cần đo điện áp tín hiệu bằng đồng hồ!");
  }
  if (ph.pinVoltage > 2.6f) {
    Serial.println("CẢNH BÁO pH: GPIO35 > 2.6V. Kiểm tra bộ chia áp R1/R2 và PO!");
  }
  Serial.println("----------------------------------------------------");

  delay(READ_INTERVAL_MS);
  // =============== GUI DU LIEU LEN BACKEND ===============

  if (lastBackendUpload == 0 ||
      millis() - lastBackendUpload >= BACKEND_INTERVAL_MS) {
    lastBackendUpload = millis();
    uploadToBackend(
      air,
      airOK,
      probeC,
      probeOK,
      soilPercent,
      soil.raw,
      phValue,
      ph.raw,
      tdsPpm
    );
  }
}
