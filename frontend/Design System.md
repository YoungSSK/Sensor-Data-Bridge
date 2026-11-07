# Design System — Sensor Data Bridge

> **Phiên bản:** 1.0 · **Phạm vi:** MVP Web · **Phong cách:** Apple-inspired, minimal, data-first  
> **Dùng chung cho:** thiết kế Figma, frontend React + Vite, tài liệu triển khai và kiểm thử UI.

## 1. Mục đích và nguyên tắc

Design System này thống nhất cách thiết kế giao diện **Sensor Data Bridge** — nền tảng tạo Channel và giám sát dữ liệu cảm biến từ ESP32, lấy cảm hứng từ các nguyên tắc trong **Apple Human Interface Guidelines (HIG)**: rõ ràng, phân cấp thị giác tốt, nhất quán, ưu tiên nội dung và tương tác tự nhiên.

**Đây là bộ nhận diện riêng của Sensor Data Bridge, không phải bộ thiết kế chính thức của Apple.** Không dùng logo Apple, sao chép nguyên mẫu giao diện Apple hay sử dụng tài nguyên phông chữ khi không có quyền tương ứng.

### 1.1. Sáu quy tắc bắt buộc

1. **Clarity — rõ ràng:** nhãn mô tả đúng hành động; người dùng luôn biết mình đang xem Channel nào.
2. **Content first — dữ liệu là trọng tâm:** chỉ số và biểu đồ quan trọng hơn các phần trang trí.
3. **Consistency — nhất quán:** một hệ token duy nhất cho màu, typography, spacing, bán kính, trạng thái.
4. **Calm — gọn và yên tĩnh:** nền trung tính, khoảng trắng rộng, một màu nhấn xanh dương; tránh gradient sặc sỡ.
5. **Responsive — thích ứng:** desktop, tablet và mobile đều thao tác được, không tạo phiên bản UI mâu thuẫn.
6. **Accessible & secure — dễ tiếp cận, an toàn:** bàn phím, focus, tương phản và quyền riêng tư được thiết kế ngay từ đầu.

### 1.2. Phạm vi màn hình MVP

| Màn hình | Đường dẫn gợi ý | Mục tiêu chính |
| --- | --- | --- |
| Đăng nhập | `/login` | Truy cập tài khoản |
| Đăng ký | `/register` | Tạo tài khoản mới |
| Channels | `/channels` | Xem các Channel đã tạo và tạo Channel mới |
| Tạo Channel | `/channels/new` (hoặc modal) | Nhập tên, mô tả và cấu hình field |
| Private View | `/channels/:channelId/private_show` | Xem số đo, biểu đồ theo field |
| API Keys | `/channels/:channelId/api_keys` | Tạo, sao chép và thu hồi khóa Read/Write |

Các đường dẫn là **định hướng thiết kế**, cần thống nhất khi triển khai frontend. Ví dụ Channel ID: **`3568980`**. Không đưa Public View, cảnh báo nâng cao, phân quyền quản trị phức tạp và ứng dụng mobile riêng vào MVP.

---

## 2. Nền tảng thị giác

### 2.1. Bảng màu — Light Mode mặc định

Nền sáng, độ tương phản rõ, card trắng trên nền xám rất nhạt. Dùng màu nhấn chủ đạo gần với xanh hệ thống Apple, nhưng đây là bảng màu của sản phẩm.

| Token | Giá trị | Sử dụng |
| --- | --- | --- |
| `--color-brand` | `#0066D6` | CTA chính, link, trạng thái được chọn; xanh đậm để đạt tương phản chữ trắng |
| `--color-brand-hover` | `#0057B8` | Hover của CTA chính |
| `--color-brand-soft` | `#EAF3FF` | Nền nhẹ cho tab/badge được chọn |
| `--color-on-brand` | `#FFFFFF` | Chữ/icon trên nền CTA xanh |
| `--color-bg` | `#F5F5F7` | Nền trang |
| `--color-surface` | `#FFFFFF` | Card, form, bảng, biểu đồ |
| `--color-surface-secondary` | `#F9F9FB` | Khu vực phụ, input nền sáng |
| `--color-text` | `#1D1D1F` | Nội dung chính |
| `--color-text-secondary` | `#6E6E73` | Nội dung phụ, mô tả |
| `--color-border` | `#DCDCE1` | Đường viền, divider |
| `--color-success` | `#248A3D` | Thành công / kết nối ổn định |
| `--color-warning` | `#AD6A00` | Cảnh báo / cần chú ý |
| `--color-danger` | `#D70015` | Lỗi và hành động thu hồi khóa |
| `--color-focus` | `#007AFF` | Vòng focus bàn phím |
| `--color-overlay` | `rgba(0,0,0,.35)` | Nền modal |

**Quy tắc dùng màu:** 80% diện tích giao diện ưu tiên nền trung tính, màu xanh chỉ đánh dấu hành động hoặc trạng thái chọn. Màu đỏ không dùng để trang trí. Không chỉ dùng màu để truyền đạt trạng thái: luôn có nhãn, biểu tượng hoặc thông điệp.

### 2.2. Dark Mode — hỗ trợ tùy chọn

| Token | Giá trị |
| --- | --- |
| `--color-brand` | `#0A84FF` |
| `--color-brand-hover` | `#409CFF` |
| `--color-on-brand` | `#0B0B0D` |
| `--color-brand-soft` | `#102A46` |
| `--color-bg` | `#0B0B0D` |
| `--color-surface` | `#1C1C1E` |
| `--color-surface-secondary` | `#2C2C2E` |
| `--color-text` | `#F5F5F7` |
| `--color-text-secondary` | `#A1A1A6` |
| `--color-border` | `#3A3A3C` |
| `--color-success` | `#30D158` |
| `--color-warning` | `#FFD60A` |
| `--color-danger` | `#FF453A` |
| `--color-focus` | `#64D2FF` |
| `--color-overlay` | `rgba(0,0,0,.60)` |

Mặc định theo `prefers-color-scheme`; nếu có tùy chọn thủ công thì dùng `data-theme="light"` / `data-theme="dark"` trên phần tử gốc. Không dùng nền trắng cố định trong biểu đồ hay modal. Kiểm tra lại tương phản thực tế của chữ trên badge và nút, nhất là Dark Mode.

### 2.3. Typography

Dùng **system font stack**, ưu tiên font hệ thống giống cảm giác hiển thị trên macOS/iOS; không đóng gói lại file font SF Pro của Apple.

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

| Kiểu chữ | Kích thước / line-height | Weight | Ví dụ |
| --- | --- | --- | --- |
| Display | `36 / 44px` | `700` | Channels |
| Page Title | `28 / 36px` | `700` | Channel `3568980` |
| Section Title | `20 / 28px` | `600` | Dữ liệu cảm biến |
| Card Title | `16 / 24px` | `600` | Nhiệt độ không khí |
| Body | `15 / 24px` | `400` | Mô tả, nội dung chính |
| Secondary | `13 / 20px` | `400` | Thời gian cập nhật |
| Caption | `12 / 18px` | `500` | Metadata, nhãn trục |
| Metric Value | `30 / 38px` | `600` | `28.2 °C` |

- Chỉ dùng 3 mức weight: `400`, `600`, `700` (khi dùng font hệ thống).
- Dữ liệu số dùng `font-variant-numeric: tabular-nums;` để không bị nhảy độ rộng khi cập nhật.
- Ngôn ngữ giao diện mặc định **tiếng Việt**; các thuật ngữ kỹ thuật giữ thống nhất: **Channel**, **Channel ID**, **Field**, **Read API Key**, **Write API Key**, **Private View**.
- Không để chữ trên nút chính nhỏ hơn 14px; văn bản điều khiển quan trọng ưu tiên 15–16px.

### 2.4. Spacing, kích thước, bán kính

Hệ thống spacing dựa trên nhịp **4px**.

| Token | Giá trị | Ứng dụng |
| --- | --- | --- |
| `space-1` | `4px` | Khoảng cách icon và text rất nhỏ |
| `space-2` | `8px` | Gap nhỏ, nhãn và nội dung |
| `space-3` | `12px` | Gap giữa các control liên quan |
| `space-4` | `16px` | Padding mobile, gap card |
| `space-5` | `20px` | Padding card nhỏ |
| `space-6` | `24px` | Padding card chuẩn |
| `space-8` | `32px` | Khoảng cách các nhóm |
| `space-10` | `40px` | Khoảng cách các section lớn |
| `space-12` | `48px` | Khoảng cách section thoáng |

| Token | Giá trị | Áp dụng |
| --- | --- | --- |
| `radius-sm` | `8px` | Badge, menu item |
| `radius-md` | `12px` | Input, button |
| `radius-lg` | `16px` | Card, popover |
| `radius-xl` | `20px` | Modal / khối nổi lớn |
| `radius-pill` | `999px` | Chip dạng viên nang |
| `control-height` | `44px` | Button/input mặc định |
| `control-height-sm` | `36px` | Filter nhỏ (không dùng làm nút chạm chính mobile) |
| `sidebar-width` | `232px` | Sidebar desktop |
| `content-max-width` | `1280px` | Bề rộng nội dung tối đa |

**Đổ bóng:** rất nhẹ, dùng đường viền nhiều hơn shadow.

```css
--shadow-card: 0 2px 12px rgba(0, 0, 0, .04);
--shadow-popover: 0 12px 32px rgba(0, 0, 0, .14);
```

Không dùng glassmorphism/blur mạnh trên card dữ liệu; blur hoặc lớp mờ chỉ nên dùng tiết chế tại header, popover hoặc modal, và phải giữ chữ dễ đọc.

### 2.5. Iconography & motion

- Sử dụng **Lucide React** (nét mảnh 1.75–2px), kích thước mặc định 20px. **Không trộn** Lucide với nhiều bộ icon có phong cách khác nhau.
- Icon gợi ý: `radio-tower` (Channels), `chart-no-axes-combined` (Private View), `key-round` (API Keys), `plus`, `copy`, `eye`, `eye-off`, `refresh-cw`, `trash-2`, `log-out`.
- Transition thông thường: **150–200ms ease-out**; modal/panel: 200–250ms. Không áp dụng hiệu ứng chuyển động cho từng điểm dữ liệu biểu đồ mỗi lần polling.
- Tôn trọng `prefers-reduced-motion: reduce`.

---

## 3. Cấu trúc và điều hướng

### 3.1. Desktop (≥ 1024px)

- Layout: sidebar trái rộng `232px`; header nội dung cao ~64px; content tối đa 1280px.
- Margin content: `32px`; khoảng cách giữa các section `24–32px`.
- Sidebar: logo chữ **Sensor Data Bridge** ở trên; `Channels` là mục chính; tài khoản ở cuối.
- Khi xem một Channel, header hiển thị **Tên Channel**, `Channel ID`, và tab con `Private View` / `API Keys`.

```text
┌──────────────────────┬──────────────────────────────────────────────────┐
│ Sensor Data Bridge   │ Channels                          [ + Tạo ]    │
│                      │                                                  │
│ ● Channels           │ Kênh của bạn                                      │
│                      │ ┌────────────────────┐ ┌────────────────────┐  │
│                      │ │ Vườn ươm cây ớt    │ │ Channel khác       │  │
│                      │ │ ID 3568980         │ │ ...                │  │
│                      │ └────────────────────┘ └────────────────────┘  │
│ Tài khoản            │                                                  │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### 3.2. Tablet (768–1023px)

- Sidebar thu gọn thành thanh điều hướng hoặc dùng top navigation; không cố giữ layout 2 cột nếu biểu đồ bị chật.
- Page padding `24px`; card biểu đồ 1–2 cột tùy **không gian khả dụng**, không tùy tên thiết bị.

### 3.3. Mobile (< 768px)

- Page padding `16px`; cards **1 cột**; header gọn.
- Navigation qua top bar + menu hoặc bottom navigation nhất quán, không có cả hai hệ cùng lúc.
- Mọi nút thao tác quan trọng có vùng chạm tối thiểu **44 × 44px**.
- Mỗi biểu đồ cho phép kéo/xem chi tiết nhưng trang **không cuộn ngang toàn bộ**.
- API Key hiển thị trong ô đơn dòng cắt bớt, kèm nút Sao chép riêng; không để chuỗi dài phá vỡ layout.

### 3.4. Breakpoints và grid

| Khoảng màn hình | Grid nội dung | Số card Channel / hàng | Số chart / hàng |
| --- | --- | --- | --- |
| `< 768px` | 4 cột logic | 1 | 1 |
| `768–1023px` | 8 cột logic | 2 | 1 hoặc 2 |
| `≥ 1024px` | 12 cột logic | 3 (nếu đủ rộng) | 2 |

Số cột chart phải có điều kiện min-width thực tế **360px/card**; nếu thấp hơn thì chuyển về 1 cột. Tránh chia đều 2 cột gây chữ nhỏ hoặc nhãn trục bị cắt.

---

## 4. Thư viện component

### 4.1. Button

| Variant | Kiểu dáng | Dùng khi |
| --- | --- | --- |
| `Primary` | Nền xanh, chữ trắng | `Đăng nhập`, `Tạo Channel`, `Lưu` |
| `Secondary` | Nền `brand-soft`, chữ xanh đậm đủ tương phản | `Xem dữ liệu`, `Tạo khóa mới` |
| `Tertiary` | Nền trong suốt, chữ chính hoặc xanh | `Hủy`, `Quay lại`, `Sao chép` |
| `Danger` | Nền đỏ hoặc viền đỏ + chữ đỏ | `Thu hồi khóa`, xóa dữ liệu |
| `Icon` | Nút 44×44px có nhãn ARIA | Làm mới, ẩn/hiện khóa |

- Default height `44px`, padding ngang `16–20px`, border-radius `12px`.
- Mỗi form hoặc modal ưu tiên **một** CTA chính.
- States bắt buộc: `default`, `hover`, `active`, `focus-visible`, `disabled`, `loading`.
- Khi loading, giữ nguyên bề rộng nút; vô hiệu hóa submit lặp nhưng không làm biến mất nhãn ngữ nghĩa.

### 4.2. Text Field / Password Field

- Nhãn **ở trên** input, không dùng placeholder thay label.
- Chiều cao 44px, nền surface, border 1px; focus ring 2px bên ngoài.
- Lỗi hiển thị dưới input bằng chữ + icon, ví dụ `Vui lòng nhập địa chỉ email hợp lệ.`
- Field xác nhận mật khẩu và toggle hiện/ẩn mật khẩu có nhãn dễ hiểu.
- Không tiết lộ tài khoản tồn tại qua thông báo đăng nhập không cần thiết.

### 4.3. Card

- Nền surface, border 1px, radius 16px, padding 24px desktop / 16px mobile.
- Card danh sách Channel: **Tên Channel**, `ID`, số field và `Cập nhật lần cuối`, một hành động chính `Mở Channel`.
- Cả card có thể click nếu không lồng nhiều nút tương tác xung đột. Nếu có menu tùy chọn thì chỉ link tên hoặc CTA.

### 4.4. Tabs / Segmented Control

- Dùng đúng 2 tab cho trang chi tiết Channel: **Private View** và **API Keys**.
- Tab đang chọn thể hiện bằng màu nhấn **và** underline/indicator rõ ràng.
- Tab tương ứng URL; tải lại trang giữ đúng tab và Channel đang xem.

### 4.5. Status & feedback

| Trạng thái | Cách hiển thị |
| --- | --- |
| Thành công | Toast ngắn `Đã tạo Channel thành công` |
| Sao chép | Toast `Đã sao chép API Key` |
| Loading | Skeleton đúng kích thước card / spinner trong nút |
| Empty | Icon nhẹ, tiêu đề, mô tả và CTA phù hợp |
| Error | Thông điệp nguyên nhân (nếu biết) + `Thử lại` |
| Offline/stale | Dòng `Chưa nhận dữ liệu mới` kèm thời điểm gần nhất, không tự khẳng định cảm biến hỏng |
| Destructive | Modal xác nhận thu hồi khóa, nêu hệ quả ESP32 mất quyền ghi |

Toast không thay thế nội dung lỗi quan trọng trong form. Tất cả toast thông thường dùng `aria-live="polite"`; lỗi nghiêm trọng có thể dùng `role="alert"`.

### 4.6. Modal & dropdown

- Modal mặc định max-width 480px; có tiêu đề, mô tả, CTA/Hủy, nút đóng rõ ràng.
- Escape đóng modal không mang tính bắt buộc xác nhận; quản lý focus trap và trả focus lại nút mở.
- Không mở modal chỉ để xem biểu đồ; dùng trang chính.
- Menu item tối thiểu 40–44px cao, icon + nhãn rõ ràng.

---

## 5. Thiết kế theo từng màn hình

### 5.1. Login / Register

**Desktop:** khung form trung tâm rộng tối đa 420px, nền trang `--color-bg`, card trắng, không có ảnh minh họa lớn. **Mobile:** form chiếm toàn chiều rộng hữu dụng.

- Logo chữ nhỏ phía trên; H1 `Đăng nhập` hoặc `Tạo tài khoản`.
- Login: Email, Mật khẩu, CTA `Đăng nhập`, link `Chưa có tài khoản? Đăng ký`.
- Register: Email, Mật khẩu, Xác nhận mật khẩu, CTA `Tạo tài khoản`.
- Chú thích về mật khẩu đặt gần form; lỗi trực tiếp cạnh field.

### 5.2. Channel List (`/channels`)

**Header:** `Channels` + phụ đề `Quản lý các kênh dữ liệu của bạn.` + nút `+ Tạo Channel`.

**Mỗi card:**

```text
Vườn ươm cây ớt                       ⋯
Channel ID: 3568980
3 fields · 221 bản ghi
Cập nhật: 07/11/2026, 14:30
[ Xem dữ liệu ]
```

Chỉ hiển thị số bản ghi nếu API trả về chính xác; không dùng số giả. Không cần tìm kiếm/lọc nâng cao ở MVP.

**Empty state:** `Bạn chưa có Channel nào` → `Tạo Channel đầu tiên`.

### 5.3. Create Channel

- Fields bắt buộc: `Tên Channel`; tùy chọn: `Mô tả`.
- Cấu hình `field1`…`field8` nếu backend hỗ trợ tối đa 8 field; **giới hạn cuối cùng phải theo API**, không tự giả định.
- Mỗi field có tên hiển thị và đơn vị (ví dụ `Nhiệt độ không khí`, `°C`).
- ID được hệ thống cấp sau khi tạo, người dùng không nhập hoặc sửa Channel ID.
- Sau thành công, điều hướng sang Private View hoặc trang chi tiết Channel.

### 5.4. Private View (`/channels/3568980/private_show`)

**Thứ tự ưu tiên:** tên kênh → tab → trạng thái dữ liệu → số liệu tổng quan → biểu đồ.

```text
Vườn ươm cây ớt                                     Channel ID: 3568980
[ Private View ] [ API Keys ]

221 bản ghi               Cập nhật gần nhất: 07/11/2026, 14:30

┌───────────────────────────────┐  ┌───────────────────────────────┐
│ Nhiệt độ không khí             │  │ Độ ẩm không khí                │
│ 28.2 °C                        │  │ 42.5 %                         │
│ [        line chart        ]   │  │ [        line chart        ]   │
└───────────────────────────────┘  └───────────────────────────────┘
┌───────────────────────────────┐
│ pH đất                         │
│ 6.86                           │
│ [        line chart        ]   │
└───────────────────────────────┘
```

**Quy định chart:**

- Mỗi `field` một chart riêng, gắn đúng tên và đơn vị của trường.
- Line chart nét 2px, điểm đo nhỏ 2–3px (hiện rõ hơn khi hover/focus); grid ngang nhẹ, không tô mảng màu lớn.
- Trục X: **thời gian**, trục Y: **giá trị đo + đơn vị**. Tooltip hiển thị giá trị đầy đủ, đơn vị và timestamp.
- Dùng **một màu chính cho từng series**; khác biệt được hỗ trợ thêm bằng nhãn/legend, không chỉ màu.
- Gợi ý palette: `field1 #007AFF`, `field2 #30A46C`, `field3 #AF52DE`, `field4 #FF9500`, `field5 #5AC8FA`, `field6 #FF2D55`, `field7 #8E8E93`, `field8 #BF5AF2`. Điều chỉnh nét/điểm để đủ tương phản ở cả 2 theme.
- Tọa độ trục nên tự scale theo khoảng dữ liệu hợp lý; **riêng pH** có thể tham chiếu miền đo `0–14` khi phù hợp nhưng không ép trục Y về 0–14 nếu làm biến thiên nhỏ khó nhìn. Không nội suy thành số liệu chưa đo.
- Polling mặc định **15–30 giây** (đề xuất UX, tùy backend/quota); có nút `Làm mới`, trạng thái tải và thời điểm cập nhật. Không tạo flash hoặc reset zoom chart mỗi lần polling.
- Xử lý **no data**, lỗi API, bản ghi thiếu field, `null`, timestamp sai hoặc dữ liệu đến không theo thứ tự. Không nối đường qua khoảng dữ liệu thiếu dài một cách gây hiểu nhầm.
- Nhất quán định dạng thời gian theo `Asia/Ho_Chi_Minh` trong UI; lưu/truyền timestamp chuẩn có timezone (ưu tiên UTC) ở API.
- Cho phép đổi khoảng xem đơn giản nếu dễ triển khai: `1 giờ / 24 giờ / 7 ngày`; nếu chưa có API hỗ trợ thì không hiển thị điều khiển giả.

### 5.5. API Keys (`/channels/3568980/api_keys`)

**Tách thành 2 card rõ ràng:** `Write API Key` và `Read API Keys`.

```text
Write API Key
Dùng cho ESP32 gửi dữ liệu vào Channel này.
••••••••••••••••                   [ Sao chép* ] [ Tạo khóa mới ]

Read API Keys
Dùng để đọc dữ liệu từ Channel này.
Tên khóa        Tạo ngày       Trạng thái        Thao tác
Ứng dụng A      07/11/2026     Đang hoạt động    [ Thu hồi ]
[ + Tạo Read API Key ]
```

`*` Chỉ hiển thị nút Sao chép khi bí mật còn khả dụng. Với Channel API Key, backend cho phép xem lại an toàn bằng cách lưu secret đã mã hóa; key đã thu hồi hoặc key cũ không có ciphertext phải vô hiệu nút và giải thích rõ lý do.

**Luồng tạo khóa:** bấm tạo → server tạo khóa → modal hiển thị một lần + cảnh báo lưu an toàn → Sao chép → `Tôi đã lưu khóa` → đóng modal. **Thu hồi:** xác nhận trước khi gọi API, mô tả tác động cụ thể đến thiết bị đang dùng khóa đó.

- Read Key và Write Key phải có nhãn quyền rõ ràng; mặc định không tiết lộ full key trong danh sách.
- Không đưa khóa vào URL, analytics, localStorage, log trình duyệt, toast hay ảnh chụp dùng cho demo.
- Khi minh họa/screenshot phải dùng khóa giả đã được che. Nếu khóa thật lộ, tạo lại và thu hồi khóa cũ.

---

## 6. Accessibility & UX writing

- Mục tiêu tối thiểu: **WCAG 2.2 AA**. Chữ thông thường cần tương phản tối thiểu 4.5:1; chữ lớn tối thiểu 3:1; các thành phần UI thiết yếu tối thiểu 3:1.
- Có focus ring rõ khi điều hướng bằng Tab; mọi thao tác chính thực hiện được bằng bàn phím; không chỉ dựa vào hover.
- Dùng semantic HTML (`button`, `label`, `nav`, `main`, `table`) và tiêu đề theo đúng thứ tự H1/H2.
- Trạng thái biểu đồ phải có phần diễn giải văn bản (giá trị mới nhất, thời gian gần nhất); tooltip cần có giải pháp tiếp cận bằng bàn phím hoặc bảng dữ liệu thay thế.
- Không tự động đăng xuất/mất form khi refresh dữ liệu; khi session hết hạn, hiển thị thông báo và chuyển về đăng nhập an toàn.
- Hành động ghi/xóa/tạo mới phải có trạng thái thành công, thất bại; không có nút chỉ làm đẹp.
- Microcopy: ngắn, cụ thể và thân thiện; ví dụ dùng `Chưa có dữ liệu để hiển thị` thay vì `No entries`, `Bạn không có quyền xem Channel này` thay vì lỗi kỹ thuật khó hiểu.

### 6.1. Các tình huống phải thiết kế

| Tình huống | Giao diện kỳ vọng |
| --- | --- |
| Chưa đăng nhập mở Private View | Điều hướng đến login và quay về URL ban đầu sau khi đăng nhập thành công |
| Đã đăng nhập nhưng không sở hữu Channel | Trang không có quyền truy cập, không lộ thông tin/khóa |
| Channel không tồn tại | Trang 404 kèm link về Channels |
| Chưa có số liệu | Empty state trong chart, không hiển thị dữ liệu mô phỏng như dữ liệu thật |
| Mạng mất giữa chừng | Giữ số liệu cũ (ghi rõ thời gian), hiển thị lỗi và nút thử lại |
| Key bị thu hồi | Trạng thái `Đã thu hồi`, không cho sao chép/cấp quyền |
| Tạo Channel trùng tên | Cho phép hoặc chặn theo quy tắc backend, thông báo nhất quán |

---

## 7. Tokens triển khai cho React + CSS

Dùng token thay vì màu/kích thước hard-code trong component. Có thể thay CSS thuần bằng Tailwind hoặc CSS Modules, nhưng **giá trị token phải là nguồn sự thật duy nhất**.

```css
:root,
[data-theme="light"] {
  color-scheme: light;
  --color-brand: #0066d6;
  --color-brand-hover: #0057b8;
  --color-on-brand: #ffffff;
  --color-brand-soft: #eaf3ff;
  --color-bg: #f5f5f7;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9f9fb;
  --color-text: #1d1d1f;
  --color-text-secondary: #6e6e73;
  --color-border: #dcdce1;
  --color-success: #248a3d;
  --color-warning: #ad6a00;
  --color-danger: #d70015;
  --color-focus: #007aff;
  --color-overlay: rgba(0, 0, 0, .35);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 999px;

  --control-height: 44px;
  --control-height-sm: 36px;
  --sidebar-width: 232px;
  --content-max-width: 1280px;
  --shadow-card: 0 2px 12px rgba(0, 0, 0, .04);
  --shadow-popover: 0 12px 32px rgba(0, 0, 0, .14);
}

[data-theme="dark"] {
  color-scheme: dark;
  --color-brand: #0a84ff;
  --color-brand-hover: #409cff;
  --color-on-brand: #0b0b0d;
  --color-brand-soft: #102a46;
  --color-bg: #0b0b0d;
  --color-surface: #1c1c1e;
  --color-surface-secondary: #2c2c2e;
  --color-text: #f5f5f7;
  --color-text-secondary: #a1a1a6;
  --color-border: #3a3a3c;
  --color-success: #30d158;
  --color-warning: #ffd60a;
  --color-danger: #ff453a;
  --color-focus: #64d2ff;
  --color-overlay: rgba(0, 0, 0, .60);
  --shadow-card: 0 2px 12px rgba(0, 0, 0, .22);
  --shadow-popover: 0 12px 32px rgba(0, 0, 0, .45);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="dark"]) {
    color-scheme: dark;
    --color-brand: #0a84ff;
    --color-brand-hover: #409cff;
    --color-brand-soft: #102a46;
    --color-bg: #0b0b0d;
    --color-surface: #1c1c1e;
    --color-surface-secondary: #2c2c2e;
    --color-text: #f5f5f7;
    --color-text-secondary: #a1a1a6;
    --color-border: #3a3a3c;
    --color-success: #30d158;
    --color-warning: #ffd60a;
    --color-danger: #ff453a;
    --color-focus: #64d2ff;
    --color-overlay: rgba(0, 0, 0, .60);
  }
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

button, input, select, textarea { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.numeric { font-variant-numeric: tabular-nums; }

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
}

.btn-primary {
  min-height: var(--control-height);
  padding: 0 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-on-brand);
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover:not(:disabled) { background: var(--color-brand-hover); }
.btn-primary:disabled { opacity: .55; cursor: not-allowed; }

@media (max-width: 767px) {
  .card { padding: var(--space-4); }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

**Ghi chú kỹ thuật:** CSS trên là điểm bắt đầu, không thay cho kiểm tra thực tế. Với nút thứ cấp, badge và biểu đồ, phải kiểm tra contrast trong theme; nếu một tổ hợp không đạt WCAG thì điều chỉnh màu **tại token/component variant** chứ không sửa riêng từng màn hình. Với Dark Mode cần quy định rõ contrast của primary text trên CTA để tránh chữ trắng trên xanh sáng không đạt mức phù hợp.

### 7.1. Cấu trúc thư mục đề xuất

```text
frontend/src/
├── styles/
│   ├── tokens.css           # Colors, spacing, radius, typography
│   └── global.css           # Reset, base, accessibility
├── components/
│   ├── ui/                  # Button, Input, Card, Modal, Tabs, Toast
│   ├── layout/              # AppShell, Sidebar, Header
│   └── charts/              # SensorChart, MetricCard, ChartEmptyState
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ChannelsPage.tsx
│   ├── ChannelCreatePage.tsx
│   ├── PrivateViewPage.tsx
│   └── ApiKeysPage.tsx
└── features/
    ├── auth/
    ├── channels/
    ├── feeds/
    └── api-keys/
```

Mỗi reusable component nên có props/variant được định nghĩa rõ, không tạo các phiên bản tùy tiện (`BlueButton`, `BigBlueButton`, v.v.). Trạng thái lấy từ API, không hard-code số đo hoặc Channel ID của ví dụ.

---

## 8. Handoff cho thiết kế & phát triển

### 8.1. Tổ chức trong Figma

- **00 — Foundations:** Colors (Light/Dark), Type Styles, Spacing, Radius, Shadows.
- **01 — Components:** Button, Input, Card, Tabs, Modal, Toast, Skeleton, Chart Card, Sidebar.
- **02 — Screens / Desktop:** Login, Register, Channels, Create Channel, Private View, API Keys.
- **03 — Screens / Tablet & Mobile:** responsive của cùng các màn hình.
- **04 — States:** Empty, Loading, Error, No Permission, Key Created, Key Revoked.

Mỗi component: dùng Auto Layout, tên variant nhất quán (`variant=primary`, `size=md`, `state=default`) và sử dụng variables/styles thay vì mã màu rải rác.

### 8.2. Checklist hoàn thành cho mỗi màn hình

- [ ] Dùng đúng tokens và components từ Design System.
- [ ] Có thiết kế desktop (≥1024), tablet (768–1023) và mobile (<768).
- [ ] Có cả Light/Dark Mode nếu theme tối được bật.
- [ ] Có loading, empty, success, error và permission state phù hợp.
- [ ] Điều hướng và URL đúng theo Channel ID, tab giữ được sau refresh.
- [ ] Text tiếng Việt nhất quán, đủ tương phản và không tràn layout.
- [ ] Thao tác bằng bàn phím được, focus rõ, nút đủ vùng chạm.
- [ ] Không để lộ Write/Read API Key trong UI ngoài luồng hiển thị được phép.
- [ ] Không hiển thị dữ liệu giả như dữ liệu đo thật.
- [ ] Dữ liệu biểu đồ hiển thị đúng timezone, giá trị và đơn vị.

## 9. Tài liệu tham khảo

- Apple Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/
- Apple HIG: Layout — https://developer.apple.com/design/human-interface-guidelines/layout
- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- Lucide Icons — https://lucide.dev/

**Thứ tự ưu tiên khi có khác biệt:** `README.md` quyết định **phạm vi tính năng MVP**; `Design System.md` quyết định **giao diện và quy tắc tương tác**; hợp đồng API thực tế quyết định **đường dẫn/giới hạn dữ liệu đã triển khai**.
