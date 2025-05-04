import { Request, Response } from "express";
import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Tạo payment mới (ghi nhận thanh toán)
export const createPayment = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { booking_id, payment_method, amount, transaction_id } = req.body;
    
    if (!booking_id || !payment_method) {
      return res.status(400).json({ message: "Booking ID and payment method are required" });
    }
    
    // Kiểm tra booking tồn tại và thuộc về học sinh
    const booking = await db.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.id, booking_id),
        eq(schema.bookings.student_id, studentId)
      ),
      with: {
        tutor: {
          with: {
            user: true
          }
        },
        payment: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found or does not belong to you" });
    }
    
    // Kiểm tra booking đã được thanh toán chưa
    if (booking.payment && booking.payment.status === "completed") {
      return res.status(400).json({ message: "This booking has already been paid" });
    }
    
    // Validate amount
    const bookingAmount = Number(booking.total_amount);
    let paymentAmount = amount ? parseFloat(amount.toString()) : bookingAmount;
    if (isNaN(paymentAmount)) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }
    
    // Tính phí dịch vụ (ví dụ: 10%)
    const serviceFee = parseFloat((paymentAmount * 0.1).toFixed(2));
    const netAmount = parseFloat((paymentAmount - serviceFee).toFixed(2));
    
    // Tạo payment mới hoặc cập nhật payment hiện tại
    let payment;
    
    if (booking.payment) {
      const updateData = {
        transaction_id: transaction_id || booking.payment.transaction_id,
        amount: paymentAmount.toString(),
        fee: serviceFee.toString(),
        net_amount: netAmount.toString(),
        payment_method,
        status: "pending" as const, // Ban đầu là pending, sau đó sẽ được cập nhật thành completed khi VNPay callback
        updated_at: new Date()
      };
      
      [payment] = await db.update(schema.payments)
        .set(updateData)
        .where(eq(schema.payments.booking_id, booking_id))
        .returning();
    } else {
      const newPayment = {
        booking_id,
        transaction_id,
        amount: paymentAmount.toString(),
        fee: serviceFee.toString(),
        net_amount: netAmount.toString(),
        payer_id: studentId,
        payee_id: booking.tutor.user_id, // ID của user (không phải tutor_profile)
        payment_method,
        status: "pending" as const,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      [payment] = await db.insert(schema.payments)
        .values([newPayment]) // Bọc đối tượng trong mảng
        .returning();
    }
    
    // TODO: Tích hợp với VNPay API để tạo thanh toán
    // Đoạn code dưới đây chỉ là giả lập, cần thay thế bằng tích hợp thực tế
    const paymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    
    return res.status(201).json({
      message: "Payment initiated successfully",
      payment,
      payment_url: paymentUrl
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Create payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// VNPay callback - xử lý kết quả thanh toán
export const handlePaymentCallback = async (req: Request, res: Response) => {
  try {
    // TODO: Implement VNPay callback handling
    const { vnp_ResponseCode, vnp_TxnRef, vnp_Amount, vnp_PayDate, ...otherParams } = req.query;
    
    // Validate callback data
    if (!vnp_ResponseCode || !vnp_TxnRef) {
      return res.status(400).json({ message: "Invalid callback data" });
    }
    
    // Lấy payment theo transaction ID
    const payment = await db.query.payments.findFirst({
      where: eq(schema.payments.transaction_id, vnp_TxnRef as string),
      with: {
        booking: true
      }
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    // Cập nhật trạng thái payment
    let paymentStatus = "failed";
    
    if (vnp_ResponseCode === "00") {
      paymentStatus = "completed";
      
      // Cập nhật trạng thái booking sang confirmed (nếu đang pending)
      if (payment.booking.status === "pending") {
        await db.update(schema.bookings)
          .set({
            status: "confirmed",
            updated_at: new Date()
          })
          .where(eq(schema.bookings.id, payment.booking_id));
      }
    }
    
    // Lưu dữ liệu thanh toán
    const [updatedPayment] = await db.update(schema.payments)
      .set({
        status: paymentStatus,
        payment_data: { ...otherParams, vnp_ResponseCode, vnp_Amount, vnp_PayDate },
        updated_at: new Date()
      })
      .where(eq(schema.payments.id, payment.id))
      .returning();
    
    // Redirect về trang kết quả thanh toán
    const redirectUrl = paymentStatus === "completed"
      ? `/payment/success?id=${payment.id}`
      : `/payment/failed?id=${payment.id}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Handle payment callback error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy thông tin thanh toán theo ID
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const paymentId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (isNaN(paymentId)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }
    
    // Lấy payment
    const payment = await db.query.payments.findFirst({
      where: eq(schema.payments.id, paymentId),
      with: {
        booking: {
          with: {
            student: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                avatar: true
              }
            },
            tutor: {
              with: {
                user: {
                  columns: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    // Kiểm tra quyền truy cập (chỉ người thanh toán, người nhận hoặc admin)
    if (payment.payer_id !== userId && payment.payee_id !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ message: "You don't have permission to view this payment" });
    }
    
    return res.status(200).json(payment);
  } catch (error) {
    console.error("Get payment by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Lấy danh sách thanh toán của người dùng
export const getUserPayments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Lấy vai trò của người dùng
    const isTutor = req.user?.role === "tutor";
    
    // Status filter
    const status = req.query.status as string;
    
    // Lọc thanh toán dựa trên vai trò
    const conditions = [];
    
    if (isTutor) {
      conditions.push(eq(schema.payments.payee_id, userId));
    } else {
      conditions.push(eq(schema.payments.payer_id, userId));
    }
    
    if (status && status !== 'all') {
      conditions.push(eq(schema.payments.status, status));
    }
    
    // Lấy payments
    const payments = await db.query.payments.findMany({
      where: conditions.length === 1 ? conditions[0] : and(...conditions),
      with: {
        booking: {
          with: {
            student: {
              columns: {
                id: true,
                first_name: true,
                last_name: true,
                avatar: true
              }
            },
            tutor: {
              with: {
                user: {
                  columns: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [desc(schema.payments.created_at)]
    });
    
    return res.status(200).json(payments);
  } catch (error) {
    console.error("Get user payments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Admin: Phê duyệt thanh toán cho gia sư
export const approvePaymentToTutor = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const paymentId = parseInt(req.params.id);
    
    if (!userId || req.user?.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized - Only admin can approve payments" });
    }
    
    if (isNaN(paymentId)) {
      return res.status(400).json({ message: "Invalid payment ID" });
    }
    
    // Lấy payment
    const payment = await db.query.payments.findFirst({
      where: eq(schema.payments.id, paymentId),
      with: {
        booking: true
      }
    });
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    // Kiểm tra trạng thái payment
    if (payment.status !== "completed") {
      return res.status(400).json({ message: "Cannot approve payment that isn't completed" });
    }
    
    // Kiểm tra trạng thái booking
    if (payment.booking.status !== "completed") {
      return res.status(400).json({ message: "Cannot approve payment for booking that isn't completed" });
    }
    
    // TODO: Tích hợp với ngân hàng API để chuyển tiền cho gia sư
    // Đây là nơi sẽ tích hợp API chuyển khoản thực tế
    
    // Cập nhật trạng thái payment
    const [updatedPayment] = await db.update(schema.payments)
      .set({
        status: "tutor_paid", // Trạng thái đã thanh toán cho gia sư
        updated_at: new Date()
      })
      .where(eq(schema.payments.id, paymentId))
      .returning();
    
    return res.status(200).json({
      message: "Payment approved and transferred to tutor successfully",
      payment: updatedPayment
    });
  } catch (error) {
    console.error("Approve payment to tutor error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};