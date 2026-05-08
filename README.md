# Bảng tín hiệu Crypto v4

## Nâng cấp trong bản này

- Xem được nhiều token phổ biến hơn qua CoinGecko.
- Hiển thị giá hiện tại.
- Hiển thị đỉnh lịch sử ATH và thời gian ATH.
- Hiển thị đáy lịch sử ATL và thời gian ATL.
- Hiển thị tiếng Việt có dấu, không lỗi font.
- Thuật ngữ chuyên ngành có song ngữ Anh - Việt.
- Funding Rate lấy từ Binance Futures nếu token được hỗ trợ.
- Auto refresh mỗi 30 giây.

## Cách deploy lên Vercel

1. Giải nén file zip.
2. Upload lại toàn bộ 3 file:
   - index.html
   - style.css
   - app.js
3. Deploy lại trên Vercel.

## Lưu ý

Một số token không có Funding Rate vì không có hợp đồng futures trên Binance.
ATH/ATL lấy từ CoinGecko.
