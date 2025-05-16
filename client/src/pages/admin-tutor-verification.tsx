import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";

// Interface cho tutors đang chờ xác minh
interface PendingTutor {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
  };
  created_at: string;
}

export default function AdminTutorVerification() {
  const { toast } = useToast();

  // Truy vấn danh sách tutors đang chờ xác minh
  const { data: pendingTutors, isLoading, refetch } = useQuery<PendingTutor[]>({
    queryKey: ["/api/v1/admin/pending-tutors"],
    // Tắt truy vấn API để sử dụng dữ liệu mẫu
    enabled: false,
  });

  // Dữ liệu mẫu cho tutors đang chờ xác minh
  const mockPendingTutors: PendingTutor[] = [
    {
      id: 1,
      user: {
        id: 101,
        first_name: "Nguyễn",
        last_name: "Văn A",
        email: "nguyenvana@example.com",
        avatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A",
      },
      created_at: "2025-05-10T10:30:00Z"
    },
    {
      id: 2,
      user: {
        id: 102,
        first_name: "Trần",
        last_name: "Thị B",
        email: "tranthib@example.com",
        avatar: "https://ui-avatars.com/api/?name=Tran+Thi+B",
      },
      created_at: "2025-05-12T14:25:00Z"
    },
    {
      id: 3,
      user: {
        id: 103,
        first_name: "Lê",
        last_name: "Văn C",
        email: "levanc@example.com",
        avatar: "https://ui-avatars.com/api/?name=Le+Van+C",
      },
      created_at: "2025-05-13T09:15:00Z"
    },
    {
      id: 4,
      user: {
        id: 104,
        first_name: "Phạm",
        last_name: "Thị D",
        email: "phamthid@example.com",
        avatar: "https://ui-avatars.com/api/?name=Pham+Thi+D",
      },
      created_at: "2025-05-14T11:20:00Z"
    },
    {
      id: 5,
      user: {
        id: 105,
        first_name: "Hoàng",
        last_name: "Văn E",
        email: "hoangvane@example.com",
        avatar: "https://ui-avatars.com/api/?name=Hoang+Van+E",
      },
      created_at: "2025-05-14T16:45:00Z"
    }
  ];

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

  // Xử lý phê duyệt tutor
  const handleApproveTutor = async (tutorId: number) => {
    try {
      // Trong môi trường thực tế, gọi API
      // await apiRequest("POST", `/api/v1/admin/tutors/${tutorId}/approve`);

      toast({
        title: "Thành công",
        description: "Đã chấp nhận yêu cầu xác minh gia sư",
        variant: "default",
      });

      // Cập nhật lại danh sách sau khi thao tác thành công
      // refetch();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xác minh gia sư. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  // Xử lý từ chối tutor
  const handleRejectTutor = async (tutorId: number) => {
    try {
      // Trong môi trường thực tế, gọi API
      // await apiRequest("POST", `/api/v1/admin/tutors/${tutorId}/reject`);

      toast({
        title: "Thành công",
        description: "Đã từ chối yêu cầu xác minh gia sư",
        variant: "default",
      });

      // Cập nhật lại danh sách sau khi thao tác thành công
      // refetch();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể từ chối yêu cầu. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  // Sử dụng dữ liệu API hoặc dữ liệu mẫu
  const displayPendingTutors = pendingTutors || mockPendingTutors;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Duyệt yêu cầu gia sư</h1>
            <p className="text-muted-foreground mt-1">
              Kiểm tra và phê duyệt các yêu cầu đăng ký làm gia sư trên nền tảng
            </p>
          </div>
          <Button variant="outline">
            Lọc theo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách gia sư chờ xác minh</CardTitle>
            <CardDescription>
              Những hồ sơ gia sư đang chờ phê duyệt để tham gia vào hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Đang tải dữ liệu...</span>
              </div>
            ) : displayPendingTutors.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-16 w-16 mx-auto text-muted-foreground" />
                <p className="mt-4 text-lg text-muted-foreground">Không có gia sư nào đang chờ xác minh</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-4 px-4 font-medium">Gia sư</th>
                      <th className="py-4 px-4 font-medium">Email</th>
                      <th className="py-4 px-4 font-medium">Ngày yêu cầu</th>
                      <th className="py-4 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPendingTutors.map((tutor) => (
                      <tr key={tutor.id} className="border-b">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={tutor.user.avatar} alt={`${tutor.user.first_name} ${tutor.user.last_name}`} />
                              <AvatarFallback>
                                {tutor.user.first_name[0]}
                                {tutor.user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{tutor.user.first_name} {tutor.user.last_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">{tutor.user.email}</td>
                        <td className="py-4 px-4">{formatDate(tutor.created_at)}</td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleApproveTutor(tutor.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Chấp nhận
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleRejectTutor(tutor.id)}
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
                    Hiển thị {displayPendingTutors.length} kết quả
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      Trước
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Tiếp
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết hồ sơ</CardTitle>
            <CardDescription>
              Xem chi tiết thông tin ứng viên gia sư khi click vào họ tên
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Chọn một gia sư từ danh sách trên để xem chi tiết hồ sơ
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
