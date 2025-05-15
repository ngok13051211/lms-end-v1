import dotenv from 'dotenv';
dotenv.config();

import transporter from '../config/mail';

/**
 * Script để kiểm tra kết nối tới SMTP server và gửi email thử nghiệm
 */
async function testMailConnection() {
  console.log('Kiểm tra kết nối tới SMTP server...');

  try {
    // Kiểm tra kết nối
    const verifyResult = await transporter.verify();
    console.log('✅ Kết nối SMTP thành công:', verifyResult);

    // Thực hiện gửi email thử nghiệm
    console.log('\nĐang gửi email thử nghiệm...');

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || 'HomiTutor <noreply@homitutor.vn>',
      to: process.env.SMTP_USER || 'test@example.com', // Gửi đến chính email của bạn để test
      subject: 'HomiTutor - Thử nghiệm kết nối email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0;">Homi<span style="color: #10b981;">Tutor</span></h1>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #374151;">Email thử nghiệm</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">
              Nếu bạn nhận được email này, tức là hệ thống gửi email của bạn đã được cấu hình thành công và hoạt động đúng.
            </p>
            <p style="color: #6b7280; margin-bottom: 0;">Bây giờ bạn có thể sử dụng chức năng OTP thông qua email thật.</p>
          </div>
          <div style="text-align: center; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} HomiTutor. Tất cả các quyền được bảo lưu.</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email thử nghiệm đã được gửi thành công!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📤 Response:', info.response);
    console.log('\n🎉 Cấu hình email đã sẵn sàng để sử dụng!');
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra kết nối email:', error);
    console.log('\n⚠️ HƯỚNG DẪN XỬ LÝ LỖI:');
    console.log('1. Kiểm tra SMTP_USER và SMTP_PASS trong file .env (đảm bảo không có khoảng trắng trong App Password)');
    console.log('2. Bạn PHẢI LÀM những bước sau đây cho tài khoản Google:');
    console.log('   a. Bật xác thực hai lớp: https://myaccount.google.com/security -> 2-Step Verification -> On');
    console.log('   b. Tạo App Password: https://myaccount.google.com/apppasswords');
    console.log('      - Chọn "Mail" làm ứng dụng');
    console.log('      - Chọn "Other" làm thiết bị và gõ "HomiTutor"');
    console.log('      - Sao chép 16 ký tự App Password (KHÔNG CÓ KHOẢNG TRẮNG) vào .env');
    console.log('3. Khởi động lại server sau khi cập nhật .env');
    console.log('\nLưu ý: Google đã chặn "Less secure app access" và chỉ cho phép App Password');
  }
}

// Chạy hàm kiểm tra
testMailConnection();
