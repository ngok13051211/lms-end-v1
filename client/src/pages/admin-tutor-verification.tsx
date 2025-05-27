// filepath: d:\lms-end-v1\client\src\pages\admin-tutor-verification.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  FileText,
  Mail,
  Calendar,
  MapPin,
  BookOpen,
  GraduationCap,
  Phone,
  Info,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Interface para la respuesta de la API de solicitudes de enseñanza
interface TeachingRequestsResponse {
  requests: TeachingRequest[];
  total: number;
  total_pages: number;
  current_page: number;
}

// Interface para solicitud de enseñanza
interface TeachingRequest {
  id: number;
  subject: {
    id: number;
    name: string;
  };
  level: {
    id: number;
    name: string;
  };
  tutor_profile: {
    id: number;
    bio?: string;
    user: {
      id: number;
      first_name?: string;
      last_name?: string;
      email: string;
      phone?: string;
      avatar?: string;
      date_of_birth?: string;
      address?: string;
    };
  };
  introduction: string;
  experience: string;
  certifications?: string;
  status: string;
  approved_by?: number;
  rejection_reason?: string;
  created_at: string;
}

// Helper function to get json from fetch response
async function fetchJson<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const response = await apiRequest(method, url, data);
  return (await response.json()) as T;
}

export default function AdminTutorVerification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<TeachingRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("pending"); const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Truy vấn danh sách yêu cầu giảng dạy theo trạng thái
  const {
    data: teachingRequestsData,
    isLoading,
    error,
  } = useQuery<TeachingRequestsResponse>({
    queryKey: ["/api/v1/admin/teaching-requests", { status: activeTab }],
    queryFn: () =>
      fetchJson<TeachingRequestsResponse>(
        "GET",
        `/api/v1/admin/teaching-requests?status=${activeTab}`
      ),
    refetchOnWindowFocus: false,
  });

  // Mutation để phê duyệt yêu cầu giảng dạy
  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      fetchJson(
        "PATCH",
        `/api/v1/admin/teaching-requests/${requestId}/approve`,
        {}
      ),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã chấp nhận yêu cầu giảng dạy",
        variant: "default",
      });
      // Đóng dialog chi tiết nếu đang mở
      setDetailsOpen(false);
      // Cập nhật lại danh sách sau khi xử lý thành công
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/admin/teaching-requests"],
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.message ||
        "Không thể duyệt yêu cầu giảng dạy. Vui lòng thử lại sau.";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error approving teaching request:", error);
    },
  });

  // Mutation để từ chối yêu cầu giảng dạy
  const rejectMutation = useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: number;
      reason: string;
    }) =>
      fetchJson(
        "PATCH",
        `/api/v1/admin/teaching-requests/${requestId}/reject`,
        { rejection_reason: reason }
      ),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã từ chối yêu cầu giảng dạy",
        variant: "default",
      });
      setRejectDialogOpen(false);
      setRejectionReason("");
      // Cập nhật lại danh sách sau khi xử lý thành công
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/admin/teaching-requests"],
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.message || "Không thể từ chối yêu cầu. Vui lòng thử lại sau.";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error rejecting teaching request:", error);
    },
  });

  // Định dạng ngày giờ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Xử lý phê duyệt yêu cầu giảng dạy
  const handleApproveRequest = (requestId: number) => {
    approveMutation.mutate(requestId);
  };

  // Mở dialog từ chối và lưu ID yêu cầu hiện tại
  const openRejectDialog = (requestId: number) => {
    setCurrentRequestId(requestId);
    setRejectDialogOpen(true);
  };

  // Xử lý từ chối yêu cầu
  const handleRejectSubmit = () => {
    if (currentRequestId && rejectionReason.trim()) {
      rejectMutation.mutate({
        requestId: currentRequestId,
        reason: rejectionReason.trim(),
      });
    } else {
      toast({
        title: "Cảnh báo",
        description: "Vui lòng nhập lý do từ chối",
        variant: "destructive",
      });
    }
  };

  // Hiển thị chi tiết yêu cầu giảng dạy
  const handleViewRequestDetail = (request: TeachingRequest) => {
    console.log("Selected request:", request); // Debug log
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  // Kiểm tra nếu URL là hình ảnh
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.endsWith(ext));
  };

  // Kiểm tra nếu URL là PDF
  const isPdfUrl = (url: string): boolean => {
    return url.toLowerCase().endsWith(".pdf");
  };

  // Hiển thị chứng chỉ với các loại file khác nhau
  const renderCertifications = (certificationsString?: string) => {
    if (!certificationsString) return "Không có chứng chỉ";

    let certifications: string[] = [];

    try {
      // Kiểm tra nếu đã là mảng
      if (Array.isArray(certificationsString)) {
        certifications = certificationsString;
      } else {
        // Cố gắng parse JSON
        const parsed = JSON.parse(certificationsString);
        if (Array.isArray(parsed)) {
          certifications = parsed;
        } else if (typeof parsed === 'string') {
          // Nếu parse ra chuỗi đơn lẻ
          certifications = [parsed];
        } else {
          console.log("Định dạng chứng chỉ không phải mảng:", parsed);
          return "Định dạng chứng chỉ không hợp lệ";
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
      console.error("Error parsing certifications:", e);
      return "Định dạng chứng chỉ không hợp lệ";
    }
  };  // Danh sách các yêu cầu dạy học được lọc theo trạng thái
  const teachingRequests = teachingRequestsData?.requests || [];
  // Lọc danh sách yêu cầu giảng dạy dựa trên từ khóa tìm kiếm
  const filteredRequests = teachingRequests.filter((request) => {
    if (!searchTerm.trim()) return true;

    const firstName = (request.tutor_profile.user.first_name || '').toLowerCase();
    const lastName = (request.tutor_profile.user.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = (request.tutor_profile.user.email || '').toLowerCase();
    const term = searchTerm.toLowerCase().trim();

    return fullName.includes(term) || email.includes(term);
  });

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = filteredRequests.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Map trạng thái sang văn bản hiển thị
  const statusText = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
  };
  // Handler để thay đổi tab
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm(""); // Reset search term when changing tab
    setPage(1); // Reset pagination when changing tab
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Quản lý yêu cầu giảng dạy
              </h1>
              {!isLoading &&
                !error &&
                teachingRequests &&
                teachingRequests.length > 0 && (
                  <Badge className="ml-2 bg-primary text-white text-sm">
                    {teachingRequests.length}
                  </Badge>
                )}
            </div>
            <p className="text-muted-foreground mt-1">
              Xem và quản lý các yêu cầu giảng dạy từ gia sư trên nền tảng
            </p>          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">          <div>            <CardTitle>Danh sách yêu cầu giảng dạy</CardTitle>
            <CardDescription className="min-h-[24px]">
              Tổng cộng {teachingRequests.length} yêu cầu giảng dạy {statusText[activeTab as keyof typeof statusText].toLowerCase()}
            </CardDescription><div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />                <Input
                  placeholder="Tìm kiếm theo tên hoặc email gia sư..."
                  className="pl-10 pr-4"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1); // Reset to first page when searching
                  }}
                /></div>
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    {activeTab === "pending" && (
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>
                    )}
                    {activeTab === "approved" && (
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    )}
                    {activeTab === "rejected" && (
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                    )}
                    <SelectValue placeholder="Lọc theo trạng thái" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="flex items-center gap-2">
                    Chờ duyệt
                  </SelectItem>
                  <SelectItem value="approved" className="flex items-center gap-2">
                    Đã duyệt
                  </SelectItem>
                  <SelectItem value="rejected" className="flex items-center gap-2">
                    Đã từ chối
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center min-h-[500px] py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <span>Đang tải dữ liệu...</span>
              </div>
            ) : error ? (<div className="text-center py-12">
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <p className="mt-4 text-lg text-muted-foreground">
                Đã xảy ra lỗi khi tải dữ liệu
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Thử lại
              </Button>
            </div>
            ) : teachingRequests.length === 0 ? (<div className="text-center py-12 min-h-[500px] flex flex-col items-center justify-center">
              <UserCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                {activeTab === "pending" && "Không có yêu cầu giảng dạy nào đang chờ duyệt"}
                {activeTab === "approved" && "Không có yêu cầu giảng dạy nào đã được duyệt"}
                {activeTab === "rejected" && "Không có yêu cầu giảng dạy nào đã bị từ chối"}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2 max-w-md">
                {activeTab === "pending" && "Khi gia sư gửi yêu cầu giảng dạy mới, họ sẽ xuất hiện ở đây để bạn xét duyệt"}
                {activeTab === "approved" && "Các yêu cầu giảng dạy đã được chấp nhận sẽ xuất hiện ở đây"}
                {activeTab === "rejected" && "Các yêu cầu giảng dạy đã bị từ chối sẽ xuất hiện ở đây"}
              </p>
            </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 min-h-[500px] flex flex-col items-center justify-center">
                <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  Không tìm thấy kết quả phù hợp với từ khóa "{searchTerm}"
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchTerm("")}
                >
                  Xóa tìm kiếm
                </Button>
              </div>
            ) : (<div className="overflow-x-auto min-h-[500px]">
              <table className="w-full table-fixed">
                <thead>                    <tr className="border-b text-left">
                  <th className="py-4 px-4 font-medium w-[25%]">Gia sư</th>
                  <th className="py-4 px-4 font-medium w-[15%]">Môn học</th>
                  <th className="py-4 px-4 font-medium w-[15%]">Cấp độ</th>
                  <th className="py-4 px-4 font-medium w-[15%]">Ngày yêu cầu</th>
                  <th className="py-4 px-4 font-medium text-center w-[30%]">
                    Thao tác
                  </th>
                </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            {" "}
                            <AvatarImage
                              src={request.tutor_profile.user.avatar}
                              alt={`${request.tutor_profile.user.first_name} ${request.tutor_profile.user.last_name}`}
                            />
                            <AvatarFallback>
                              {request.tutor_profile.user.first_name?.[0] ||
                                ""}
                              {request.tutor_profile.user.last_name?.[0] ||
                                ""}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              onClick={() => handleViewRequestDetail(request)}
                              className="font-medium text-left hover:underline hover:text-primary cursor-pointer"
                            >
                              {`${request.tutor_profile.user.first_name || ""
                                } ${request.tutor_profile.user.last_name || ""
                                }`}
                            </button>
                            <div className="text-xs text-muted-foreground mt-1">
                              {request.tutor_profile.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="bg-primary/10">
                          {request.subject.name}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {request.introduction.substring(0, 40)}...
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary">
                          {request.level.name}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {request.experience
                            ? "Có kinh nghiệm"
                            : "Chưa có kinh nghiệm"}
                        </div>
                      </td>                        <td className="py-4 px-4">
                        {formatDate(request.created_at)}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {activeTab === "pending" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                                onClick={() => openRejectDialog(request.id)}
                                disabled={
                                  approveMutation.isPending &&
                                  approveMutation.variables === request.id
                                }
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Từ chối
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewRequestDetail(request)}
                              >
                                <Info className="h-4 w-4 mr-1" />
                                Chi tiết
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={
                                  approveMutation.isPending &&
                                  approveMutation.variables === request.id
                                }
                              >
                                {approveMutation.isPending &&
                                  approveMutation.variables === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Chấp nhận
                              </Button>
                            </>
                          ) : (
                            <>
                              {/* Left placeholder to maintain centering */}
                              <div className="inline-flex invisible items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-[82px] px-4 py-2">
                                Placeholder
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewRequestDetail(request)}
                              >
                                <Info className="h-4 w-4 mr-1" />
                                Chi tiết
                              </Button>

                              {/* Right placeholder to maintain centering */}
                              <div className="inline-flex invisible items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-[92px] px-4 py-2">
                                Placeholder
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}                  </tbody>
              </table>
              <div className="flex items-center justify-between mt-6">                  <div className="text-sm text-muted-foreground">
                Hiển thị{" "}
                <span className="font-medium">
                  {paginatedRequests.length > 0
                    ? `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filteredRequests.length)}`
                    : "0"}
                </span>{" "}
                / {filteredRequests.length} yêu cầu giảng dạy {statusText[activeTab as keyof typeof statusText].toLowerCase()}
                {searchTerm && (
                  <span> (đang lọc với từ khóa "<strong>{searchTerm}</strong>")</span>
                )}
              </div><div className="flex space-x-2 min-w-[168px] justify-end">
                  {totalPages > 1 ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Trước
                      </Button>
                      <span className="text-sm flex items-center px-2 text-muted-foreground">
                        Trang {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        Tiếp
                      </Button>
                    </>
                  ) : (
                    <div className="h-8"></div>
                  )}
                </div>
              </div>
            </div>)}
          </CardContent>
        </Card>
      </div>

      {/* Dialog xem chi tiết yêu cầu giảng dạy */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu giảng dạy</DialogTitle>
            {selectedRequest && (
              <Badge
                className={
                  selectedRequest.status === "approved"
                    ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200 w-fit mt-2"
                    : selectedRequest.status === "rejected"
                      ? "bg-red-100 text-red-800 hover:bg-red-100 border-red-200 w-fit mt-2"
                      : "bg-yellow-50 text-yellow-800 hover:bg-yellow-50 border-yellow-200 w-fit mt-2"
                }
                variant="outline"
              >
                {statusText[selectedRequest.status as keyof typeof statusText]}
              </Badge>
            )}
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={selectedRequest.tutor_profile.user.avatar}
                    alt={`${selectedRequest.tutor_profile.user.first_name} ${selectedRequest.tutor_profile.user.last_name}`}
                  />
                  <AvatarFallback className="text-xl">
                    {selectedRequest.tutor_profile.user.first_name?.[0] || ""}
                    {selectedRequest.tutor_profile.user.last_name?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {`${selectedRequest.tutor_profile.user.first_name || ""} ${selectedRequest.tutor_profile.user.last_name || ""
                      }`}
                  </h3>
                  <div className="flex items-center text-muted-foreground mt-1">
                    <Mail className="h-4 w-4 mr-1" />
                    <span>{selectedRequest.tutor_profile.user.email}</span>
                  </div>
                  {selectedRequest.tutor_profile.user.phone && (
                    <div className="flex items-center text-muted-foreground mt-1">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{selectedRequest.tutor_profile.user.phone}</span>
                    </div>
                  )}                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="text-xs">
                  Yêu cầu gửi: {formatDate(selectedRequest.created_at)}
                </Badge>
                <div className="w-4"></div> {/* Empty div for spacing */}
              </div>

              <div className="grid gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" /> Môn học
                    </h4>
                    <Badge variant="outline" className="bg-primary/10">
                      {selectedRequest.subject.name}
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <GraduationCap className="h-4 w-4 mr-1" /> Cấp độ giảng
                      dạy
                    </h4>
                    <Badge variant="secondary">
                      {selectedRequest.level.name}
                    </Badge>
                  </div>
                </div>
                {selectedRequest.tutor_profile.bio && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <Info className="h-4 w-4 mr-1" /> Giới thiệu bản thân
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.tutor_profile.bio}
                    </p>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center">
                    <Info className="h-4 w-4 mr-1" /> Giới thiệu trong lĩnh vực
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRequest.introduction}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" /> Kinh nghiệm giảng dạy
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedRequest.experience}
                  </p>
                </div>

                {selectedRequest.tutor_profile.user.date_of_birth && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" /> Ngày sinh
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.tutor_profile.user.date_of_birth}
                    </p>
                  </div>
                )}

                {selectedRequest.tutor_profile.user.address && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> Địa chỉ
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.tutor_profile.user.address}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-1" /> Chứng chỉ
                  </h4>
                  <div className="text-sm">
                    {renderCertifications(selectedRequest.certifications)}
                  </div>
                </div>

                {selectedRequest.rejection_reason && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center text-red-500">
                      <XCircle className="h-4 w-4 mr-1" /> Lý do từ chối
                    </h4>
                    <p className="text-sm text-red-500/80 whitespace-pre-wrap border-l-2 border-red-300 pl-3 py-1">
                      {selectedRequest.rejection_reason}
                    </p>
                  </div>
                )}              </div>

              <Separator />

              <DialogFooter>
                <div className="w-full flex justify-between">
                  {activeTab === "pending" ? (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setDetailsOpen(false);
                          openRejectDialog(selectedRequest.id);
                        }}
                        disabled={approveMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Từ chối
                      </Button>
                      <Button
                        onClick={() => handleApproveRequest(selectedRequest.id)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Chấp nhận
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="invisible">Placeholder</div>
                      <Button
                        onClick={() => setDetailsOpen(false)}
                      >
                        Đóng
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Dialog từ chối yêu cầu giảng dạy */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu giảng dạy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do từ chối</Label>
              <Textarea
                id="reason"
                placeholder="Vui lòng nhập lý do từ chối..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-sm text-muted-foreground">
                Lý do từ chối sẽ được gửi tới gia sư để họ có thể điều chỉnh và
                gửi lại yêu cầu.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Từ chối yêu cầu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
