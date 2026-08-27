# Rà soát thanh toán công nợ tài xế qua PayOS

Ngày rà soát: 27/08/2026  
Phạm vi: app tài xế, API backend, webhook PayOS và màn hình tài chính admin.

## Mục tiêu nghiệp vụ

1. Tài xế chọn khoản công nợ và mở trang thanh toán PayOS.
2. Khi PayOS xác nhận đã nhận đúng tiền, PayOS gọi webhook về backend.
3. Backend xác thực webhook, ghi giao dịch thành công và tự động giảm công nợ tài xế. Không cần admin duyệt.
4. Duyệt thủ công chỉ dùng khi không thể tạo mã/link PayOS (ví dụ hết hạn mức/gói PayOS hoặc dịch vụ PayOS lỗi).
5. Không được giảm nợ hai lần; không được mất giao dịch đã thanh toán; mọi khoản treo phải có cơ chế đối soát.

## Luồng hiện tại

```text
App tài xế -> POST /api/payos/driver/create-link
             -> tạo DebtTransaction PENDING + payosOrderCode
             -> tạo checkoutUrl PayOS
Tài xế -> thanh toán trên PayOS
PayOS -> POST /api/payos/webhook
      -> verify chữ ký -> SUCCESS -> giảm Driver.walletDebt
```

Màn admin hiện chỉ lấy các giao dịch `PENDING` **không có** `payosOrderCode`, vì vậy về thiết kế, giao dịch PayOS phải được tự xử lý, còn giao dịch fallback mới chờ admin.

## Kết luận hiện trạng

Luồng tự duyệt PayOS đã có trong mã nguồn, nhưng chưa bảo đảm vận hành an toàn. Có thể xảy ra tình huống tài xế đã thấy PayOS báo thành công nhưng công nợ vẫn còn. Nguyên nhân chính là hệ thống chỉ coi webhook là nguồn xác nhận cuối cùng, trong khi webhook hiện chưa có retry/đối soát đáng tin cậy.

## Các lỗi và rủi ro

### P0 — Webhook lỗi nhưng vẫn trả HTTP 200, làm mất cơ hội PayOS gửi lại

- Vị trí: `backend/controllers/payosController.js`, `handleWebhook`.
- Hiện trạng: khối `catch` trả `200 { success: false }`.
- Hậu quả: khi lỗi tạm thời (MongoDB chập chờn, biến môi trường sai, lỗi code hoặc timeout), PayOS có thể coi webhook đã được tiếp nhận và không retry. Giao dịch PayOS đã thành công nhưng `DebtTransaction` vẫn `PENDING`, công nợ không giảm.
- Dấu hiệu: PayOS/QR báo thành công, nhưng app tài xế vẫn hiện nợ và backend không có log xử lý thành công theo `orderCode`.

**Cách xử lý triệt để**

1. Chỉ trả `2xx` sau khi đã xác thực webhook và cập nhật dữ liệu thành công.
2. Khi có lỗi nội bộ, trả `500` để PayOS retry theo chính sách của họ.
3. Log cấu trúc tối thiểu: `orderCode`, mã webhook, chữ ký hợp lệ/không hợp lệ, ID giao dịch, trạng thái trước/sau và lỗi.
4. Thêm tác vụ đối soát định kỳ các giao dịch `PENDING` có `payosOrderCode`: gọi API truy vấn trạng thái payment link của PayOS; nếu PayOS đã thanh toán thì xử lý như webhook.
5. Có màn hình/admin report riêng cho các giao dịch PayOS treo quá 5–15 phút; không để lẫn vào danh sách duyệt thủ công.

### P0 — Fallback thủ công của app tài xế gọi sai tham số

- Vị trí:
  - `driver-app/src/pages/Earnings.jsx`: gọi `requestDebtPayment(selectedDebt.amount, selectedDebt.date)`.
  - `driver-app/src/services/api.js`: hàm lại khai báo `requestDebtPayment(driverId, amount, targetDate)`.
- Hậu quả: số tiền bị đưa vào URL như `driverId`, ngày bị gửi vào trường `amount`; backend không tạo được yêu cầu thanh toán thủ công đúng cách. Đây là nguyên nhân giao dịch chờ hoặc lỗi không nhất quán trong lúc PayOS gặp sự cố.

**Cách xử lý triệt để**

1. Bỏ `driverId` khỏi URL của endpoint driver vì backend đã lấy tài xế từ JWT (`req.driver._id`). Ví dụ: `POST /api/debts/driver/request-payment`.
2. Client chỉ gọi `requestDebtPayment(amount, targetDate)`.
3. Backend kiểm tra chặt `amount` là số nguyên dương hợp lệ và `targetDate` theo định dạng `YYYY-MM-DD`.
4. Thêm test API cho fallback: gọi từ tài xế đăng nhập, tạo đúng một transaction `PENDING` không có `payosOrderCode`.

### P0 — Webhook có thể giảm công nợ hai lần khi nhận callback đồng thời

- Vị trí: `handleWebhook` đang dùng `findOne(... status: 'PENDING')`, sau đó `save()`, rồi mới `$inc walletDebt`.
- Hậu quả: hai callback đến gần như cùng lúc có thể cùng đọc trạng thái `PENDING`, sau đó cả hai cùng giảm `walletDebt`.

**Cách xử lý triệt để**

1. Dùng cập nhật có điều kiện nguyên tử: `findOneAndUpdate({ payosOrderCode, status: 'PENDING' }, { $set: { status: 'SUCCESS', ... } }, { new: true })`.
2. Chỉ tiến hành giảm `walletDebt` khi lệnh trên thực sự trả về giao dịch vừa đổi trạng thái. Lần callback trùng sẽ nhận `null` và trả `200` mà không làm gì.
3. Tốt nhất bọc cập nhật transaction và ví tài xế trong MongoDB transaction/session, hoặc có cơ chế bù trừ/reconciliation nếu cập nhật ví thất bại sau khi transaction đã `SUCCESS`.
4. Thêm test gửi đồng thời hai webhook cùng `orderCode`, xác nhận ví chỉ giảm một lần.

### P1 — Tạo lại link làm ghi đè `payosOrderCode` cũ

- Vị trí: `createPaymentLink` tìm một giao dịch PayOS `PENDING` theo ngày, sau đó gán mã đơn hàng mới lên chính giao dịch đó.
- Hậu quả: nếu tài xế đã mở link A, tạo thêm link B rồi lại thanh toán link A, webhook A không còn tìm thấy `payosOrderCode` tương ứng. Tiền có thể đã vào PayOS nhưng công nợ không tự giảm.

**Cách xử lý triệt để**

1. Một payment link PayOS phải có một `DebtTransaction` riêng và không bao giờ thay đổi `payosOrderCode` sau khi đã tạo.
2. Khi tạo link mới, giữ link cũ để webhook/đối soát vẫn nhận diện được; có thể chủ động hủy link cũ qua PayOS và lưu trạng thái `CANCELLED`/`EXPIRED` riêng.
3. Không cho tạo link mới khi link trước còn hiệu lực, hoặc hiển thị nút “tiếp tục thanh toán” sử dụng lại URL/link đang có.
4. Thêm unique index cho `payosOrderCode` (sparse/partial index) để không có hai giao dịch dùng cùng mã.

### P1 — Endpoint admin vẫn có thể duyệt giao dịch PayOS nếu gọi trực tiếp

- Vị trí: `financeController.approveDebt` và `rejectDebt` chỉ kiểm tra loại và trạng thái `PENDING`; không từ chối khi có `payosOrderCode`.
- Hiện tại UI danh sách đã lọc PayOS ra, nhưng một request trực tiếp từ người có quyền admin vẫn có thể duyệt/từ chối transaction PayOS đang chờ webhook.

**Cách xử lý triệt để**

1. Trong `approveDebt` và `rejectDebt`, từ chối các giao dịch có `payosOrderCode` với thông báo “Giao dịch PayOS được xử lý tự động/đối soát PayOS”.
2. Chỉ tài khoản có vai trò kế toán cao hơn mới được thực hiện “can thiệp đối soát”, bắt buộc nhập lý do và lưu audit log.

### P1 — Không có hàng đợi/nhật ký webhook và không có đối soát các khoản treo

- Hậu quả: khó biết PayOS đã gọi webhook chưa, lỗi do xác thực hay do DB, và khó xử lý các khoản tiền đã vào nhưng transaction còn `PENDING`.

**Cách xử lý triệt để**

1. Lưu `PayOSWebhookEvent` hoặc log audit gồm `eventId`/mã giao dịch, payload đã che thông tin nhạy cảm, thời gian nhận, kết quả verify, lỗi và transaction liên quan.
2. Tạo job chạy mỗi 5 phút để đối soát `PENDING` có `payosOrderCode` còn mới; job khác quét các khoản treo lâu hơn (ví dụ 15 phút, 1 giờ, 24 giờ) và tạo cảnh báo.
3. Trang admin “PayOS cần đối soát” hiển thị `orderCode`, tài xế, số tiền, thời điểm tạo, trạng thái PayOS, số lần webhook và nút đối soát lại. Không đặt ở danh sách “tài xế báo đã chuyển khoản”.
4. Alert nội bộ khi webhook lỗi liên tiếp hoặc số giao dịch PayOS treo vượt ngưỡng.

### P2 — Giá trị thanh toán do client gửi chưa được ràng buộc theo công nợ

- Hiện trạng: client gửi `amount` và `targetDate`; backend không xác nhận số tiền có tương ứng khoản nợ đang mở hay không.
- Hậu quả: có thể thanh toán thiếu/dư hoặc gán về ngày không đúng, gây khó đối chiếu và có thể làm số dư nợ âm.

**Cách xử lý triệt để**

1. Backend tự tính khoản nợ còn phải thu theo dữ liệu server, không tin số tiền/khung ngày từ client.
2. Nếu cho trả một phần, lưu rõ `originalDebt`, `paidAmount`, `remainingAmount` và áp dụng quy tắc phân bổ theo ngày.
3. Không cho `walletDebt` âm nếu nghiệp vụ không cho phép; khoản dư chuyển thành số dư có đối soát riêng.

### P2 — Mã orderCode không được ràng buộc duy nhất ở cơ sở dữ liệu

- Hiện trạng: mã được sinh từ thời gian và số ngẫu nhiên; schema chưa có unique index.
- Hậu quả: xác suất thấp nhưng vẫn có khả năng trùng mã trong tải cao hoặc nhiều instance backend.

**Cách xử lý triệt để**

1. Tạo unique sparse index cho `payosOrderCode`.
2. Nếu tạo/lưu gặp duplicate key, sinh lại mã và thử lại giới hạn số lần.
3. Ưu tiên chiến lược order code theo chuẩn PayOS, bảo đảm số và duy nhất toàn hệ thống.

## Vì sao admin có thể vẫn thấy yêu cầu duyệt tay

Sự kiện hiển thị modal duyệt tay chỉ được phát khi app gọi endpoint fallback `request-payment`; webhook PayOS không phát sự kiện này. Các tình huống thường gặp là:

1. App báo lỗi/timed out lúc tạo link, chuyển sang QR thủ công; nhưng payment link PayOS thực tế đã được tạo và sau đó tài xế vẫn thanh toán link đó.
2. Tài xế mở QR fallback và bấm “Đã chuyển khoản - gửi yêu cầu”, tạo giao dịch thủ công song song.
3. Phiên bản backend cũ trước khi tách PayOS/fallback có thể làm hai luồng dùng chung một transaction `PENDING`.
4. Webhook PayOS gặp lỗi, transaction PayOS vẫn treo; người vận hành sau đó xử lý bằng thao tác thủ công.

Do đó không được xem thông báo “PayOS thành công” trên trình duyệt là bằng chứng backend đã giảm nợ. Nguồn xác nhận nghiệp vụ phải là webhook đã verify hoặc kết quả đối soát API PayOS.

## Lộ trình sửa dứt điểm

### Giai đoạn 1 — Chặn phát sinh sai (ưu tiên triển khai ngay)

1. Sửa chữ ký API fallback và endpoint driver.
2. Làm webhook idempotent bằng cập nhật điều kiện nguyên tử.
3. Không trả `200` khi verify/lưu dữ liệu thất bại.
4. Chặn admin duyệt/từ chối trực tiếp transaction có `payosOrderCode`.
5. Tạo unique index cho `payosOrderCode`.
6. Mỗi link PayOS một transaction cố định, không ghi đè order code cũ.

### Giai đoạn 2 — Phục hồi và đối soát

1. Viết script/job quét tất cả `DebtTransaction` `PENDING` có `payosOrderCode`.
2. Tra trạng thái từng order với PayOS bằng credential production.
3. Khoản đã thanh toán: chạy cùng hàm idempotent như webhook để chuyển `SUCCESS` và giảm nợ đúng một lần.
4. Khoản chưa thanh toán/hết hạn: đánh dấu phù hợp (ví dụ `EXPIRED`), cho phép tài xế tạo link mới.
5. Xuất báo cáo trước/sau đối soát để kế toán xác nhận các khoản được xử lý tự động.

### Giai đoạn 3 — Kiểm thử trước khi deploy

1. Thanh toán thành công một lần: nợ giảm đúng một lần, admin không nhận yêu cầu duyệt.
2. Gửi lại cùng payload webhook nhiều lần và đồng thời: nợ chỉ giảm một lần.
3. Mô phỏng lỗi DB trong webhook: endpoint trả lỗi và webhook được retry/đối soát sau đó.
4. Tạo link A, tạo lại link B, thanh toán A và B: mỗi giao dịch được nhận diện riêng, không mất tiền/không giảm trùng.
5. PayOS không tạo được link: chỉ khi đó QR fallback hiện ra; xác nhận yêu cầu thủ công tạo đúng một transaction chờ admin.
6. API admin cố duyệt transaction PayOS: phải bị từ chối.
7. Kiểm thử app mobile thực tế khi đóng/mở Capacitor Browser và mạng chập chờn.

## Kiểm tra cấu hình production bắt buộc

- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` có trên môi trường backend production và đúng tài khoản PayOS.
- Dashboard PayOS cấu hình webhook HTTPS công khai đúng URL: `https://api.aloshipp.com/api/payos/webhook`.
- Reverse proxy/CDN không chặn `POST` webhook hoặc thay đổi JSON body/chữ ký.
- Log production có request `POST /api/payos/webhook` và log theo `orderCode`.
- Múi giờ, domain API và phiên bản backend deploy phải khớp mã nguồn đã sửa.

## Tiêu chí hoàn thành

Hệ thống chỉ được xem là hoàn thành khi có thể chứng minh bằng log và kiểm thử rằng:

1. Một khoản PayOS thành công luôn được tự giảm công nợ mà không cần admin.
2. Callback lặp không thể làm giảm nợ hai lần.
3. Lỗi webhook không làm mất giao dịch; có retry hoặc đối soát khôi phục được.
4. Fallback thủ công chỉ xuất hiện khi PayOS không thể khởi tạo thanh toán và luôn tạo yêu cầu admin hợp lệ.
5. Các giao dịch treo lịch sử đã được đối soát, có audit log và kết quả rõ ràng.
