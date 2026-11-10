/**
 * Tiện ích chuẩn hóa và hiển thị thời gian theo múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh).
 */

export const parseUtcDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  let str = String(value).trim();
  // Nếu chuỗi ISO chưa có định danh múi giờ ('Z' hoặc offset +07:00 / -xx:xx),
  // tự động gắn 'Z' (UTC) để trình duyệt chuyển đổi chính xác sang giờ Việt Nam.
  if (!str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str + 'Z';
  }
  return new Date(str);
};

export const formatDate = (value, options = false) => {
  if (!value) return '—';
  const parsed = parseUtcDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return '—';

  let includeDate = false;
  let includeSeconds = false;
  let dateStyle = 'short';

  if (typeof options === 'boolean') {
    includeDate = options;
  } else if (typeof options === 'object' && options !== null) {
    includeDate = Boolean(options.includeDate);
    includeSeconds = Boolean(options.includeSeconds);
    dateStyle = options.dateStyle || 'short';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    ...(includeDate ? { dateStyle } : {}),
    timeStyle: includeSeconds ? 'medium' : 'short',
  }).format(parsed);
};
