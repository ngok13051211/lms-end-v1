# Hướng dẫn khắc phục sự cố OTP

## Vấn đề nhiều OTP được gửi cùng lúc

Đã phát hiện vấn đề khi nhiều email OTP khác nhau được gửi đến người dùng trong quá trình xác thực, gây nhầm lẫn và khó sử dụng hệ thống. Vấn đề này đã được khắc phục với các thay đổi sau:

### Nguyên nhân
1. **Đa điểm truy cập API**: Hệ thống có nhiều endpoint xử lý OTP dẫn đến việc gửi lại OTP mới nhiều lần.
2. **Thiếu kiểm soát tần suất**: Không có cơ chế kiểm soát tốt về thời gian giữa các lần gửi OTP.
3. **Các OTP cũ vẫn còn hiệu lực**: Hệ thống chưa vô hiệu hóa các OTP cũ khi tạo OTP mới.

### Các sửa đổi đã thực hiện

1. **Thống nhất API xác thực**:
   - Đã hợp nhất logic xác thực OTP từ nhiều endpoint xuống một endpoint chính (`/api/v1/verify/verify-otp`).
   - Đã làm cho endpoint cũ (`/api/v1/auth/verify-otp`) chuyển hướng đến endpoint chính.

2. **Kiểm soát gửi OTP**:
   - Đã thực hiện rate limiting 60 giây giữa các lần gửi OTP.
   - Nếu yêu cầu mới đến trong thời gian giới hạn, hệ thống sẽ thông báo người dùng kiểm tra email cũ.

3. **Quản lý OTP tốt hơn**:
   - Đã vô hiệu hóa tất cả các OTP cũ khi tạo OTP mới.
   - Sử dụng OTP mới nhất thay vì cũ nhất khi xác thực.
   - Khi xác thực thành công, vô hiệu hóa tất cả các OTP khác của người dùng đó.

4. **Log và gửi email rõ ràng hơn**:
   - Cải thiện log để dễ dàng theo dõi quá trình gửi và xác thực OTP.
   - Thêm thông tin chi tiết về thời gian và trạng thái của OTP.

5. **API giám sát OTP**:
   - Đã thêm API `/api/v1/verify/otp-status?email=user@example.com` để kiểm tra trạng thái OTP hiện tại.

### Cách khắc phục nếu vẫn gặp vấn đề

Nếu người dùng vẫn gặp vấn đề với việc nhận nhiều email OTP:

1. Kiểm tra trạng thái OTP thông qua API `/api/v1/verify/otp-status?email=<email-người-dùng>`.
2. Kiểm tra logs trên server để xem có nhiều yêu cầu OTP được gửi từ frontend không.
3. Đảm bảo người dùng đợi ít nhất 60 giây trước khi yêu cầu một OTP mới.
4. Khuyên người dùng luôn sử dụng OTP mới nhất trong email mới nhất.

### Cấu hình Gmail SMTP

Để đảm bảo gửi email hoạt động chính xác, hãy làm theo [hướng dẫn thiết lập email](./email-setup-guide.md) và kiểm tra cài đặt sau trong file `.env`:

```
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
```

**Lưu ý**: Mã App Password của Gmail chứ không phải mật khẩu tài khoản thông thường.
