/**
 * @desc    Từ chối yêu cầu đăng ký dạy học
 * @route   PATCH /api/v1/admin/teaching-requests/:id/reject
 * @access  Private (Admin only)
 */
export const rejectTeachingRequest = async (req: Request, res: Response) => {
    try {
        console.log("Bắt đầu xử lý từ chối yêu cầu giảng dạy");
        const requestId = parseInt(req.params.id);
        const adminId = req.user?.id;
        const { rejection_reason } = req.body;

        console.log("Dữ liệu nhận được:", { requestId, adminId, rejection_reason });

        if (!adminId) {
            return res.status(401).json({ message: "Không được phép" });
        }

        if (isNaN(requestId)) {
            return res.status(400).json({ message: "ID yêu cầu không hợp lệ" });
        }

        if (!rejection_reason) {
            return res.status(400).json({ message: "Lý do từ chối là bắt buộc" });
        }

        // Kiểm tra yêu cầu có tồn tại không
        const request = await db.query.teachingRequests.findFirst({
            where: eq(schema.teachingRequests.id, requestId),
        });

        if (!request) {
            return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
        }

        console.log("Tìm thấy yêu cầu:", request);

        // Cập nhật trạng thái yêu cầu thành đã từ chối
        await db
            .update(schema.teachingRequests)
            .set({
                status: "rejected",
                rejection_reason: rejection_reason,
                approved_by: adminId, // Lưu thông tin người từ chối
                updated_at: new Date(),
            })
            .where(eq(schema.teachingRequests.id, requestId));

        console.log("Đã cập nhật trạng thái yêu cầu thành rejected");

        return res.status(200).json({
            success: true,
            message: "Yêu cầu giảng dạy đã được từ chối thành công",
        });
    } catch (error) {
        console.error("Lỗi khi xử lý từ chối yêu cầu giảng dạy:", error);
        return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};
