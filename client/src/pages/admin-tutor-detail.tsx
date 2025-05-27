import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAdminTutorDetail } from "@/hooks/useAdminTutorDetailQuery";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  UserCheck,
  ArrowLeft,
  Star,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  BookOpen,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminTutorDetail() {
  // Sử dụng route chính là /admin-dashboard/tutors/:id
  const [, params] = useRoute("/admin-dashboard/tutors/:id");
  const tutorId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("teaching-requests");
  const [selectedTeachingRequest, setSelectedTeachingRequest] = useState<any>(null);

  // Gọi hook query để lấy thông tin gia sư
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminTutorDetail(tutorId);

  const tutorDetail = data?.data;

  // Hàm định dạng ngày tháng
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Hàm định dạng tiền tệ
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "Chưa thiết lập";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Xử lý khóa/mở khóa tài khoản gia sư
  const handleToggleUserStatus = async () => {
    if (!tutorDetail?.user) return;

    try {
      const operation = tutorDetail.user.is_active ? "deactivate" : "activate";
      const endpoint = `/api/v1/admin/users/${tutorDetail.user.id}/${operation}`;

      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Không thể ${operation === "deactivate" ? "khóa" : "mở khóa"} tài khoản`);
      }

      toast({
        title: "Thành công",
        description: `Đã ${operation === "deactivate" ? "khóa" : "mở khóa"} tài khoản của gia sư`,
      });

      // Tải lại thông tin
      await refetch();
    } catch (error) {
      console.error("Lỗi khi thay đổi trạng thái tài khoản:", error);
      toast({
        title: "Lỗi",
        description: `Không thể ${tutorDetail.user.is_active ? "khóa" : "mở khóa"} tài khoản`,
        variant: "destructive",
      });
    }
  };

  // Xử lý xác minh gia sư (phê duyệt yêu cầu dạy học)
  const handleApproveTeachingRequest = async (requestId: number) => {
    try {
      const response = await fetch(`/api/v1/admin/teaching-requests/${requestId}/approve`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Không thể phê duyệt yêu cầu dạy học");
      }

      toast({
        title: "Thành công",
        description: "Đã phê duyệt yêu cầu dạy học",
      });

      // Tải lại thông tin
      await refetch();
    } catch (error) {
      console.error("Lỗi khi phê duyệt yêu cầu dạy học:", error);
      toast({
        title: "Lỗi",
        description: "Không thể phê duyệt yêu cầu dạy học",
        variant: "destructive",
      });
    }
  };

  // Xử lý từ chối yêu cầu dạy học
  const handleRejectTeachingRequest = async () => {
    if (!selectedRequestId) return;

    try {
      const response = await fetch(`/api/v1/admin/teaching-requests/${selectedRequestId}/reject`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (!response.ok) {
        throw new Error("Không thể từ chối yêu cầu dạy học");
      }

      toast({
        title: "Thành công",
        description: "Đã từ chối yêu cầu dạy học",
      });

      // Đóng dialog và reset form
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedRequestId(null);

      // Tải lại thông tin
      await refetch();
    } catch (error) {
      console.error("Lỗi khi từ chối yêu cầu dạy học:", error);
      toast({
        title: "Lỗi",
        description: "Không thể từ chối yêu cầu dạy học",
        variant: "destructive",
      });
    }
  };  // Kiểm tra nếu URL là hình ảnh
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

    try {
      // Kiểm tra trường hợp cấu trúc chứng chỉ kiểu cũ (object với name, organization, ...)
      const certifications = JSON.parse(certificationsString);

      // Nếu là mảng các object có cấu trúc cũ
      if (Array.isArray(certifications) && certifications.length > 0) {
        if (typeof certifications[0] === 'object' && certifications[0].name) {
          return (
            <div className="space-y-3">
              {certifications.map((cert: any, index: number) => (
                <div key={index} className="border rounded p-3 bg-slate-50 shadow-sm">
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-slate-800 w-32">Tên chứng chỉ:</span>
                    <span className="text-slate-900 font-medium">{cert.name}</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <span className="font-medium text-slate-800 w-32">Tổ chức cấp:</span>
                    <span className="text-slate-900">{cert.organization}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium text-slate-800 w-32">Ngày cấp:</span>
                    <span className="text-slate-900">{formatDate(cert.issued_date)}</span>
                  </div>
                  {cert.image_url && (
                    <div className="mt-3 border-t pt-2">
                      <a href={cert.image_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline flex items-center text-sm">
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Xem chứng chỉ
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }

        // Nếu là mảng các string URL
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
      console.error("Lỗi khi parse chứng chỉ:", e);
      return "Định dạng chứng chỉ không hợp lệ";
    }
  };

  // Hiển thị UI loading
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Đang tải thông tin gia sư...</span>
        </div>
      </DashboardLayout>
    );
  }      // Hiển thị UI lỗi
  if (isError || !tutorDetail) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => navigate("/admin-dashboard/tutors")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại danh sách gia sư
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-red-500">
                <p className="text-lg font-medium">
                  Có lỗi xảy ra khi tải thông tin gia sư
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {(error as Error)?.message || "Vui lòng thử lại sau"}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => refetch()}
                >
                  Thử lại
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // UI chính
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">        <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => navigate("/admin-dashboard/tutors")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại danh sách gia sư
          </Button>
        </div>
      </div>

        {/* Thông tin cơ bản của gia sư */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">
              Chi tiết gia sư: {tutorDetail.user.first_name} {tutorDetail.user.last_name}
            </CardTitle>
            <CardDescription>
              Thông tin chi tiết và quản lý gia sư
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6">
            {/* Phần thông tin hiển thị bên trái */}
            <div className="col-span-1 flex flex-col items-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={tutorDetail.user.avatar} alt={`${tutorDetail.user.first_name} ${tutorDetail.user.last_name}`} />
                <AvatarFallback className="text-2xl">
                  {tutorDetail.user.first_name?.charAt(0)}
                  {tutorDetail.user.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>              <h3 className="text-xl font-medium mt-4">
                {tutorDetail.user.first_name} {tutorDetail.user.last_name}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={tutorDetail.tutor_profile?.is_verified ? "default" : "secondary"}>
                  {tutorDetail.tutor_profile?.is_verified ? "Đã xác minh" : "Chưa xác minh"}
                </Badge>
                <Badge variant={tutorDetail.user.is_active ? "outline" : "destructive"}>
                  {tutorDetail.user.is_active ? "Đang hoạt động" : "Bị khóa"}
                </Badge>
              </div>              {tutorDetail.tutor_profile?.rating > 0 && (
                <div className="flex items-center mt-4">
                  <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  <span className="ml-1 font-medium">{tutorDetail.tutor_profile?.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground ml-1">
                    ({tutorDetail.tutor_profile?.total_reviews} đánh giá)
                  </span>
                </div>
              )}

              <Separator className="my-4 w-full" />

              <div className="space-y-3 w-full text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{tutorDetail.user.email}</span>
                </div>
                {tutorDetail.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{tutorDetail.user.phone}</span>
                  </div>
                )}
                {tutorDetail.user.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{tutorDetail.user.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Tham gia: {formatDate(tutorDetail.user.created_at)}</span>                </div>
                {tutorDetail.user.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Ngày sinh: {formatDate(tutorDetail.user.date_of_birth)}</span>
                  </div>
                )}
                {tutorDetail.tutor_profile?.bio && (
                  <div className="flex items-start gap-2 mt-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Giới thiệu: {tutorDetail.tutor_profile?.bio}</span>
                    </div>
                  </div>
                )}
                {tutorDetail.tutor_profile?.availability && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Lịch dạy:</span>
                      <p className="text-sm">{tutorDetail.tutor_profile?.availability}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4 w-full" />              <div className="w-full space-y-3">
                <Button
                  variant={tutorDetail.user.is_active ? "destructive" : "default"}
                  className="w-full"
                  onClick={handleToggleUserStatus}
                >
                  {tutorDetail.user.is_active ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Khóa tài khoản
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Mở khóa tài khoản
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Phần thông tin chính */}
            <div className="col-span-1 lg:col-span-3">              <Tabs
              defaultValue="teaching-requests"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="mb-4">                <TabsTrigger value="teaching-requests">
                Yêu cầu dạy học ({tutorDetail.teaching_requests.length})
              </TabsTrigger>
                <TabsTrigger value="courses">
                  Khóa học ({tutorDetail.courses.length})
                </TabsTrigger>
                {selectedTeachingRequest && (
                  <TabsTrigger value="teaching-request-detail">
                    Chi tiết: {selectedTeachingRequest.subject.name} - {selectedTeachingRequest.level.name}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="teaching-requests">
                <Card>
                  <CardHeader>
                    <CardTitle>Yêu cầu dạy học</CardTitle>
                    <CardDescription>
                      Danh sách các yêu cầu đăng ký dạy học của gia sư
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tutorDetail.teaching_requests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Gia sư chưa có yêu cầu đăng ký dạy học nào
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Môn học</TableHead>
                            <TableHead>Cấp độ</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tutorDetail.teaching_requests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>{request.subject.name}</TableCell>
                              <TableCell>{request.level.name}</TableCell>
                              <TableCell>
                                {request.status === "pending" && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Chờ duyệt
                                  </Badge>
                                )}
                                {request.status === "approved" && (
                                  <Badge className="bg-green-50 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Đã duyệt
                                  </Badge>
                                )}
                                {request.status === "rejected" && (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Từ chối
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(request.created_at)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">                                  <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Lưu request hiện tại vào state
                                    setSelectedTeachingRequest(request);
                                    setSelectedRequestId(request.id);
                                    setActiveTab("teaching-request-detail");
                                  }}
                                >
                                  Chi tiết
                                </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="courses">
                <Card>
                  <CardHeader>
                    <CardTitle>Khóa học</CardTitle>
                    <CardDescription>
                      Danh sách các khóa học do gia sư tạo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tutorDetail.courses.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Gia sư chưa tạo khóa học nào
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tên khóa học</TableHead>
                            <TableHead>Môn học + Cấp độ</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Giá / giờ</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tutorDetail.courses.map((course) => (
                            <TableRow key={course.id}>
                              <TableCell className="font-medium">{course.name}</TableCell>
                              <TableCell>
                                {course.subject.name} - {course.level.name}
                              </TableCell>                              <TableCell>
                                {course.status === "active" && (
                                  <Badge className="bg-green-50 text-green-800">
                                    Đang mở
                                  </Badge>
                                )}
                                {course.status === "inactive" && (
                                  <Badge variant="outline">
                                    Đã ẩn
                                  </Badge>
                                )}
                                {course.status === "archived" && (
                                  <Badge variant="secondary">
                                    Đã lưu trữ
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatCurrency(course.hourly_rate)}</TableCell>
                              <TableCell>{formatDate(course.created_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teaching-request-detail">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Chi tiết yêu cầu dạy học</CardTitle>
                      <CardDescription>
                        Xem chi tiết yêu cầu đăng ký dạy học
                      </CardDescription>
                    </div>                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveTab("teaching-requests");
                        setSelectedTeachingRequest(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Quay lại
                    </Button>
                  </CardHeader>                  <CardContent>
                    {selectedTeachingRequest ? (
                      <div className="space-y-6">                        <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">
                            {selectedTeachingRequest.subject.name} - {selectedTeachingRequest.level.name}
                          </h3>
                          <Badge
                            variant={
                              selectedTeachingRequest.status === "approved" ? "default" :
                                selectedTeachingRequest.status === "pending" ? "outline" : "destructive"
                            }
                            className={selectedTeachingRequest.status === "pending" ? "bg-yellow-50 text-yellow-800 border-yellow-200" : ""}
                          >
                            {selectedTeachingRequest.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {selectedTeachingRequest.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {selectedTeachingRequest.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                            {selectedTeachingRequest.status === "approved" && "Đã duyệt"}
                            {selectedTeachingRequest.status === "pending" && "Chờ duyệt"}
                            {selectedTeachingRequest.status === "rejected" && "Từ chối"}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Ngày đăng ký: {formatDate(selectedTeachingRequest.created_at)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Môn học</h4>
                            <p>{selectedTeachingRequest.subject.name}</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Cấp độ</h4>
                            <p>{selectedTeachingRequest.level.name}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-1">Giới thiệu</h4>
                          <p className="text-sm">{selectedTeachingRequest.introduction}</p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-1">Kinh nghiệm</h4>
                          <p className="text-sm">{selectedTeachingRequest.experience}</p>
                        </div>

                        <div>
                          <h4 className="font-medium mb-1">Chứng chỉ</h4>
                          <div className="text-sm">
                            {renderCertifications(selectedTeachingRequest.certifications)}
                          </div>
                        </div>                          {selectedTeachingRequest.status === "rejected" && selectedTeachingRequest.rejection_reason && (
                          <div>
                            <h4 className="font-medium mb-1 text-red-600">Lý do từ chối</h4>
                            <p className="text-sm text-red-600">{selectedTeachingRequest.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Không tìm thấy thông tin chi tiết của yêu cầu dạy học
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

    </DashboardLayout>
  );
}