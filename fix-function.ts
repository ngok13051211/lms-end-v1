export const getPendingTeachingRequests = async (
    req: Request,
    res: Response
) => {
    try {
        // Truy vấn danh sách teaching_requests với trạng thái pending
        const pendingRequests = await db.query.teachingRequests.findMany({
            where: eq(schema.teachingRequests.status, "pending"),
            with: {
                tutor: {
                    with: {
                        user: true,
                    },
                },
                subject: true,
                level: true,
            },
            orderBy: (requests, { desc }) => [desc(requests.created_at)],
        });

        // Chuyển đổi dữ liệu để phù hợp với cấu trúc mà frontend mong đợi
        const formattedRequests = pendingRequests.map((request) => {
            // Xử lý certifications đảm bảo trả về chuỗi JSON hợp lệ
            let formattedCertifications = request.certifications;

            // Nếu certifications không phải là chuỗi JSON hợp lệ, chuyển đổi nó
            if (request.certifications) {
                try {
                    // Kiểm tra xem đã là JSON hợp lệ chưa bằng cách parse và stringify lại
                    const parsed = JSON.parse(request.certifications);
                    formattedCertifications = JSON.stringify(parsed);
                } catch (e) {
                    // Nếu không phải JSON hợp lệ, chuyển thành mảng trống
                    console.error("Lỗi khi parse certifications:", e);
                    console.log("Giá trị certifications gốc:", request.certifications);
                    formattedCertifications = "[]";
                }
            } else {
                formattedCertifications = "[]";
            }

            return {
                id: request.id,
                subject: request.subject,
                level: request.level,
                tutor_profile: {
                    id: request.tutor.id,
                    bio: request.tutor.bio,
                    date_of_birth: request.tutor.availability, // Sử dụng trường availability để lưu trữ ngày sinh
                    address: request.tutor.availability, // Sử dụng trường availability để lưu trữ địa chỉ
                    user: {
                        id: request.tutor.user.id,
                        first_name: request.tutor.user.first_name,
                        last_name: request.tutor.user.last_name,
                        email: request.tutor.user.email,
                        phone: request.tutor.user.phone,
                        avatar: request.tutor.user.avatar,
                    },
                },
                introduction: request.introduction,
                experience: request.experience,
                certifications: formattedCertifications,
                status: request.status,
                created_at: request.created_at,
            };
        });

        return res.status(200).json(formattedRequests);
    } catch (error) {
        console.error(
            "Lỗi khi lấy danh sách yêu cầu dạy học đang chờ duyệt:",
            error
        );
        return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};
