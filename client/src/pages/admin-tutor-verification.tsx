import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
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
  Info
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Interface cho yêu cầu giảng dạy đang chờ duyệt
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
    date_of_birth?: string;
    address?: string;
    user: {
      id: number;
      first_name?: string;
      last_name?: string;
      email: string;
      phone?: string;
      avatar?: string;
    };
  };
  introduction: string;
  experience: string;
  certifications?: string; // JSON string chứa mảng các URL
  status: string; // "pending", "approved", "rejected"
  approved_by?: number;
  rejection_reason?: string;
  created_at: string;
}

// Helper function to get json from fetch response
async function fetchJson<T>(method: string, url: string, data?: unknown): Promise<T> {
  const response = await apiRequest(method, url, data);
  return await response.json() as T;
}

export default function AdminTutorVerification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<TeachingRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);  // Truy vấn danh sách yêu cầu giảng dạy đang chờ duyệt
  const { data: pendingRequests = [], isLoading, error } = useQuery<TeachingRequest[]>({
    queryKey: ["/api/v1/admin/teaching-requests/pending"],
    queryFn: () => fetchJson<TeachingRequest[]>("GET", "/api/v1/admin/teaching-requests/pending"),
    refetchOnWindowFocus: false,
  });

  // Mutation để phê duyệt yêu cầu giảng dạy
  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      fetchJson("PATCH", `/api/v1/admin/teaching-requests/${requestId}/approve`, {}),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã chấp nhận yêu cầu giảng dạy",
        variant: "default",
      });
      // Đóng dialog chi tiết nếu đang mở      setDetailsOpen(false);
      // Cập nhật lại danh sách sau khi xử lý thành công
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/teaching-requests/pending"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Không thể duyệt yêu cầu giảng dạy. Vui lòng thử lại sau.";
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
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      fetchJson("PATCH", `/api/v1/admin/teaching-requests/${requestId}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã từ chối yêu cầu giảng dạy",
        variant: "default",
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      // Cập nhật lại danh sách sau khi xử lý thành công
      queryClient.invalidateQueries({ queryKey: ["/api/v1/admin/teaching-requests/pending"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Không thể từ chối yêu cầu. Vui lòng thử lại sau.";
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
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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
        reason: rejectionReason.trim()
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
    setSelectedRequest(request);
    setDetailsOpen(true);
  };
  // Kiểm tra nếu URL là hình ảnh
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.endsWith(ext));
  };

  // Kiểm tra nếu URL là PDF
  const isPdfUrl = (url: string): boolean => {
    return url.toLowerCase().endsWith('.pdf');
  };

  // Hiển thị chứng chỉ với các loại file khác nhau
  const renderCertifications = (certificationsString?: string) => {
    if (!certificationsString) return "Không có chứng chỉ";

    try {
      const certifications = JSON.parse(certificationsString);
      if (Array.isArray(certifications) && certifications.length > 0) {
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
                          (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Lỗi+Ảnh';
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text text-red-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                    <span className="text-xs mt-1 text-center truncate w-full">PDF {index + 1}</span>
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
                    <span className="text-xs mt-1 text-center truncate w-full">Chứng chỉ {index + 1}</span>
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
  };
  // Dữ liệu mẫu cho các yêu cầu giảng dạy đang chờ duyệt (sử dụng khi development)
  const mockPendingRequests: TeachingRequest[] = [
    {
      id: 1,
      subject: {
        id: 1,
        name: "Toán học"
      },
      level: {
        id: 2,
        name: "Trung học phổ thông"
      },
      tutor_profile: {
        id: 1,
        bio: "Giáo viên có 5 năm kinh nghiệm dạy học",
        date_of_birth: "1990-05-15",
        address: "Quận 1, TP HCM",
        user: {
          id: 101,
          first_name: "Nguyễn",
          last_name: "Văn A",
          email: "nguyenvana@example.com",
          avatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A",
          phone: "0123456789"
        }
      },
      introduction: "Tôi là giáo viên có 5 năm kinh nghiệm giảng dạy môn Toán tại trường THPT chuyên. Tôi mong muốn được đồng hành cùng các bạn học sinh trên con đường học tập.",
      experience: "5 năm giảng dạy tại trường THPT chuyên, 2 năm làm gia sư cho học sinh thi đại học.",
      certifications: JSON.stringify([
        "https://example.com/cert1.pdf",
        "https://example.com/cert2.jpg"
      ]),
      status: "pending",
      created_at: "2025-05-10T10:30:00Z"
    },
    {
      id: 2,
      subject: {
        id: 2,
        name: "Tiếng Anh"
      },
      level: {
        id: 3,
        name: "Đại học"
      },
      tutor_profile: {
        id: 2,
        bio: "Giảng viên đại học với chuyên môn ngôn ngữ Anh",
        date_of_birth: "1985-08-20",
        address: "Quận 3, TP HCM",
        user: {
          id: 102,
          first_name: "Trần",
          last_name: "Thị B",
          email: "tranthib@example.com",
          avatar: "https://ui-avatars.com/api/?name=Tran+Thi+B",
          phone: "0987654321"
        }
      },
      introduction: "Tôi là giảng viên đại học chuyên ngành Ngôn ngữ Anh với hơn 10 năm kinh nghiệm. Tôi đã hướng dẫn nhiều sinh viên đạt chứng chỉ IELTS và TOEFL.",
      experience: "10 năm giảng dạy tại đại học, 5 năm làm việc tại trung tâm ngoại ngữ.",
      certifications: JSON.stringify([
        "https://example.com/cert3.pdf",
        "https://example.com/cert4.jpg"
      ]),
      status: "pending",
      created_at: "2025-05-12T14:25:00Z"
    },
    {
      id: 3,
      subject: {
        id: 3,
        name: "Vật lý"
      },
      level: {
        id: 2,
        name: "Trung học phổ thông"
      },
      tutor_profile: {
        id: 3,
        user: {
          id: 103,
          first_name: "Lê",
          last_name: "Văn C",
          email: "levanc@example.com",
          avatar: "https://ui-avatars.com/api/?name=Le+Van+C",
        }
      },
      introduction: "Tôi là giáo viên vật lý với kinh nghiệm 3 năm giảng dạy tại các trường THPT.",
      experience: "3 năm giảng dạy tại trường THPT, thường xuyên tham gia các hoạt động bồi dưỡng học sinh giỏi.",
      status: "pending",
      created_at: "2025-05-13T09:15:00Z"
    },
    {
      id: 4,
      subject: {
        id: 4,
        name: "Hóa học"
      },
      level: {
        id: 2,
        name: "Trung học phổ thông"
      },
      tutor_profile: {
        id: 4,
        user: {
          id: 104,
          first_name: "Phạm",
          last_name: "Thị D",
          email: "phamthid@example.com",
          avatar: "https://ui-avatars.com/api/?name=Pham+Thi+D",
        }
      },
      introduction: "Chuyên gia hóa học với kinh nghiệm giảng dạy phong phú.",
      experience: "4 năm giảng dạy tại các trung tâm luyện thi đại học.",
      status: "pending",
      created_at: "2025-05-14T11:20:00Z"
    }
  ];
  // Sử dụng dữ liệu API trong production hoặc dữ liệu mẫu trong development
  const displayPendingRequests = pendingRequests.length > 0 ? pendingRequests : mockPendingRequests; return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Duyệt yêu cầu giảng dạy</h1>
              {!isLoading && !error && displayPendingRequests && displayPendingRequests.length > 0 && (
                <Badge className="ml-2 bg-primary text-white text-sm">
                  {displayPendingRequests.length}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Kiểm tra và phê duyệt các yêu cầu giảng dạy từ gia sư trên nền tảng
            </p>
          </div>
        </div>        <Card>
          <CardHeader>
            <CardTitle>Danh sách yêu cầu giảng dạy chờ duyệt</CardTitle>
            <CardDescription>
              Các yêu cầu giảng dạy của gia sư đang chờ phê duyệt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Đang tải dữ liệu...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle className="h-16 w-16 mx-auto text-destructive" />
                <p className="mt-4 text-lg text-muted-foreground">Đã xảy ra lỗi khi tải dữ liệu</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  Thử lại
                </Button>
              </div>
            ) : displayPendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-4 text-lg text-muted-foreground">Không có yêu cầu giảng dạy nào đang chờ duyệt</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-4 px-4 font-medium">Gia sư</th>
                      <th className="py-4 px-4 font-medium">Môn học</th>
                      <th className="py-4 px-4 font-medium">Cấp độ</th>
                      <th className="py-4 px-4 font-medium">Ngày yêu cầu</th>
                      <th className="py-4 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPendingRequests.map((request) => (<tr key={request.id} className="border-b hover:bg-muted/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">                              <AvatarImage
                            src={request.tutor_profile.user.avatar}
                            alt={`${request.tutor_profile.user.first_name} ${request.tutor_profile.user.last_name}`} />
                            <AvatarFallback>
                              {request.tutor_profile.user.first_name?.[0] || ''}
                              {request.tutor_profile.user.last_name?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              onClick={() => handleViewRequestDetail(request)}
                              className="font-medium text-left hover:underline hover:text-primary cursor-pointer"
                            >
                              {`${request.tutor_profile.user.first_name || ''} ${request.tutor_profile.user.last_name || ''}`}
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
                          {request.experience ? "Có kinh nghiệm" : "Chưa có kinh nghiệm"}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {formatDate(request.created_at)}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(request.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRequestDetail(request)}
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Chi tiết
                          </Button>                            <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={approveMutation.isPending && approveMutation.variables === request.id}
                          >
                            {approveMutation.isPending && approveMutation.variables === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Chấp nhận
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => openRejectDialog(request.id)}
                            disabled={approveMutation.isPending && approveMutation.variables === request.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Từ chối
                          </Button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Hiển thị <span className="font-medium">{displayPendingRequests.length}</span> yêu cầu giảng dạy đang chờ duyệt
                  </div>
                  {displayPendingRequests.length > 10 && (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" disabled>
                        Trước
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        Tiếp
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>      {/* Dialog xem chi tiết yêu cầu giảng dạy */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu giảng dạy</DialogTitle>
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
                    {selectedRequest.tutor_profile.user.first_name?.[0] || ''}
                    {selectedRequest.tutor_profile.user.last_name?.[0] || ''}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {`${selectedRequest.tutor_profile.user.first_name || ''} ${selectedRequest.tutor_profile.user.last_name || ''}`}
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
                  )}
                </div>
              </div>

              <Separator />              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Yêu cầu gửi: {formatDate(selectedRequest.created_at)}
                </Badge>
              </div>

              <div className="grid gap-5">
                <div className="flex gap-4">
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
                      <GraduationCap className="h-4 w-4 mr-1" /> Cấp độ giảng dạy
                    </h4>
                    <Badge variant="secondary">
                      {selectedRequest.level.name}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center">
                    <Info className="h-4 w-4 mr-1" /> Giới thiệu
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequest.introduction}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" /> Kinh nghiệm giảng dạy
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequest.experience}</p>
                </div>

                {selectedRequest.tutor_profile.bio && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <Info className="h-4 w-4 mr-1" /> Giới thiệu bản thân
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedRequest.tutor_profile.bio}</p>
                  </div>
                )}

                {selectedRequest.tutor_profile.date_of_birth && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" /> Ngày sinh
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedRequest.tutor_profile.date_of_birth}</p>
                  </div>
                )}

                {selectedRequest.tutor_profile.address && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> Địa chỉ
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedRequest.tutor_profile.address}</p>
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
              </div>

              <Separator />

              <DialogFooter>
                <div className="w-full flex justify-between">
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
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>      {/* Dialog từ chối yêu cầu giảng dạy */}
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
                Lý do từ chối sẽ được gửi tới gia sư để họ có thể điều chỉnh và gửi lại yêu cầu.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
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
