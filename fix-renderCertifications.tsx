/**
 * Hiển thị chứng chỉ với các loại file khác nhau
 * Hàm này xử lý linh hoạt các định dạng chứng chỉ có thể nhận được từ API
 */
const renderCertifications = (certificationsString?: string) => {
    if (!certificationsString) return "Không có chứng chỉ";

    let certifications: string[] = [];

    try {
        // Kiểm tra nếu đã là mảng
        if (Array.isArray(certificationsString)) {
            certifications = certificationsString;
        } else {
            // Cố gắng parse JSON
            try {
                const parsed = JSON.parse(certificationsString);
                if (Array.isArray(parsed)) {
                    certifications = parsed;
                } else if (typeof parsed === 'string') {
                    // Nếu parse ra chuỗi đơn lẻ
                    certifications = [parsed];
                } else if (parsed === null || parsed === undefined) {
                    // Nếu parsed là null hoặc undefined
                    certifications = [];
                } else {
                    // Trường hợp khác - có thể là object
                    console.log("Định dạng chứng chỉ không phải mảng:", parsed);
                    certifications = [String(parsed)];
                }
            } catch (e) {
                // Nếu không phải JSON hợp lệ, xử lý như là URL đơn lẻ
                console.error("Lỗi khi parse JSON:", e);
                console.log("Giá trị certifications gốc:", certificationsString);

                if (typeof certificationsString === 'string' && certificationsString.trim()) {
                    certifications = [certificationsString];
                } else {
                    certifications = [];
                }
            }
        }

        if (certifications.length > 0) {
            return (
                <div className="flex flex-wrap gap-3">
                    {certifications.map((cert: string, index: number) => {
                        if (isImageUrl(cert)) {
                            return (
                                <div key={index} className="relative group">
                                    <div className="border rounded-md p-1 overflow-hidden w-20 h-20 bg-gray-50">
                                        <img
                                            src={cert}
                                            alt={`Chứng chỉ ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    "https://placehold.co/100x100?text=Lỗi+Ảnh";
                                            }}
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a
                                            href={cert}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-black bg-opacity-70 text-white p-1 rounded-full"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="lucide lucide-external-link"
                                            >
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                <polyline points="15 3 21 3 21 9" />
                                                <line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            );
                        } else if (isPdfUrl(cert)) {
                            return (
                                <a
                                    key={index}
                                    href={cert}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center border rounded-md p-2 w-24 h-24 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-file-text text-red-600"
                                    >
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <line x1="10" y1="9" x2="8" y2="9" />
                                    </svg>
                                    <span className="text-xs mt-1 text-center truncate w-full">
                                        PDF {index + 1}
                                    </span>
                                </a>
                            );
                        } else {
                            return (
                                <a
                                    key={index}
                                    href={cert}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center border rounded-md p-2 w-24 h-24 bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <FileText className="h-6 w-6 text-blue-600" />
                                    <span className="text-xs mt-1 text-center truncate w-full">
                                        Chứng chỉ {index + 1}
                                    </span>
                                </a>
                            );
                        }
                    })}
                </div>
            );
        }
        return "Không có chứng chỉ";
    } catch (e) {
        console.error("Error in renderCertifications:", e);
        return "Có lỗi khi hiển thị chứng chỉ";
    }
};
