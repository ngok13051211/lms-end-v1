import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Lock,
  Unlock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interface cho dữ liệu người dùng
interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  users: User[];
  count: number;
  total_pages: number;
  current_page: number;
  message?: string;
}

interface UserDetailResponse {
  success: boolean;
  user: User;
}

interface BookingSummary {
  course_id: number;
  course_name: string;
  subject_name: string;
  tutor_name: string;
  total_sessions: number;
  completed_sessions: number;
  overall_status: "completed" | "in_progress";
}

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [studentBookings, setStudentBookings] = useState<any[]>([]);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  // Truy vấn danh sách người dùng
  const { data, isLoading, refetch } = useQuery<ApiResponse>({
    queryKey: [`users-list-${searchTerm}-${page}`],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/admin/users?search=${searchTerm}&role=student&page=${page}&limit=${pageSize}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu người dùng");
      }
      return response.json();
    },
  });

  const usersData = data || { users: [], total_pages: 1, count: 0 };

  // Định dạng ngày giờ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };  // Xử lý xem chi tiết người dùng
  const handleViewUserDetail = async (userId: number) => {
    try {
      // Kiểm tra userId hợp lệ
      if (isNaN(userId) || userId <= 0) {
        console.error("Invalid userId:", userId);
        return;
      }
      console.log("User ID:", userId, typeof userId);

      // Reset states
      setStudentBookings([]);
      setBookingSummary([]);
      setIsLoadingBookings(true);
      setBookingError(null);

      // Gọi API để lấy thông tin chi tiết user
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Không thể lấy thông tin chi tiết người dùng");
      }

      const data: UserDetailResponse = await response.json();
      setSelectedUser(data.user);
      setIsDetailModalOpen(true);      // Gọi API để lấy booking summary theo khóa học
      try {
        console.log("Gọi API booking summary với userId:", userId);
        const apiUrl = `/api/v1/admin/users/${userId}/booking-summary`;
        console.log("URL API:", apiUrl);

        const summaryResponse = await fetch(apiUrl, {
          credentials: "include",
          headers: {
            "Accept": "application/json"
          }
        });

        console.log("Response status:", summaryResponse.status);

        if (!summaryResponse.ok) {
          const errorText = await summaryResponse.text();
          console.error("API Error:", errorText);
          throw new Error(`Không thể lấy lịch sử học tập: ${summaryResponse.status}`);
        }

        const summaryData = await summaryResponse.json();
        console.log("Booking summary data:", summaryData);
        setBookingSummary(summaryData || []);
      } catch (summaryError) {
        console.error("Lỗi khi lấy booking summary:", summaryError);
        setBookingError("Không thể tải lịch sử học tập");
      }

      // Gọi API để lấy danh sách booking của user (giữ lại để tương thích)
      try {
        const bookingResponse = await fetch(`/api/v1/admin/users/${userId}/bookings`, {
          credentials: "include",
        });

        if (!bookingResponse.ok) {
          throw new Error("Không thể lấy danh sách booking");
        }

        const bookingData = await bookingResponse.json();
        setStudentBookings(bookingData.data || []);
      } catch (bookingError) {
        console.error("Lỗi khi lấy danh sách booking:", bookingError);
        setBookingError("Không thể tải danh sách booking");
      } finally {
        setIsLoadingBookings(false);
      }

    } catch (error) {
      console.error("Lỗi khi lấy thông tin chi tiết người dùng:", error);
      setIsLoadingBookings(false);
    }
  };
  // State cho dialog xác nhận khóa/mở khóa tài khoản
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"deactivate" | "activate">("deactivate");
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetUserName, setTargetUserName] = useState<string>("");
  const { toast } = useToast();

  // Mở dialog xác nhận khóa tài khoản
  const openDeactivateConfirm = (userId: number, userName: string) => {
    setTargetUserId(userId);
    setTargetUserName(userName);
    setActionType("deactivate");
    setConfirmDialogOpen(true);
  };

  // Mở dialog xác nhận mở khóa tài khoản
  const openActivateConfirm = (userId: number, userName: string) => {
    setTargetUserId(userId);
    setTargetUserName(userName);
    setActionType("activate");
    setConfirmDialogOpen(true);
  };

  // Xử lý khóa tài khoản người dùng
  const deactivateUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/deactivate`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể khóa tài khoản người dùng");
      }

      // Cập nhật lại danh sách sau khi khóa tài khoản
      await refetch();

      toast({
        title: "Thành công",
        description: "Đã khóa tài khoản học viên thành công",
      });
    } catch (error) {
      console.error("Lỗi khi khóa tài khoản người dùng:", error);
      toast({
        title: "Lỗi",
        description: "Không thể khóa tài khoản học viên",
        variant: "destructive",
      });
    }
  };

  // Xử lý mở khóa tài khoản người dùng
  const activateUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/activate`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể mở khóa tài khoản người dùng");
      }

      // Cập nhật lại danh sách sau khi mở khóa tài khoản
      await refetch();

      toast({
        title: "Thành công",
        description: "Đã mở khóa tài khoản học viên thành công",
      });
    } catch (error) {
      console.error("Lỗi khi mở khóa tài khoản người dùng:", error);
      toast({
        title: "Lỗi",
        description: "Không thể mở khóa tài khoản học viên",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>            <h1 className="text-3xl font-bold tracking-tight">
            Quản lý học viên
          </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý tất cả học viên trong hệ thống HomiTutor
            </p>
          </div>          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Thêm học viên
                </Button>
              </DialogTrigger>              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm học viên mới</DialogTitle>
                  <DialogDescription>
                    Điền thông tin để tạo tài khoản học viên mới
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="text-sm font-medium"
                      >
                        Họ
                      </label>
                      <Input id="firstName" className="mt-1" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Tên
                      </label>
                      <Input id="lastName" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input id="email" type="email" className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="password" className="text-sm font-medium">
                      Mật khẩu
                    </label>
                    <Input id="password" type="password" className="mt-1" />
                  </div>                  <div>
                    <label htmlFor="role" className="text-sm font-medium">
                      Vai trò
                    </label>
                    <Input id="role" className="mt-1" value="Học viên" disabled />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Tạo tài khoản</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Card>
          <CardHeader className="pb-3">            <CardTitle>Danh sách học viên</CardTitle>
            <CardDescription>
              Tổng cộng {usersData.users?.length || 0} học viên
            </CardDescription><div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm học viên..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Đang tải dữ liệu...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">                  <thead>
                  <tr className="border-b text-left">
                    <th className="py-4 px-4 font-medium">Học viên</th>
                    <th className="py-4 px-4 font-medium">Email</th>
                    <th className="py-4 px-4 font-medium">Ngày tham gia</th>
                    <th className="py-4 px-4 font-medium">Trạng thái</th>
                    <th className="py-4 px-4 font-medium text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                  <tbody>
                    {usersData.users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage
                                src={user.avatar}
                                alt={`${user.first_name} ${user.last_name}`}
                              />
                              <AvatarFallback>
                                {user.first_name[0]}
                                {user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {user.first_name} {user.last_name}
                            </span>
                          </div>
                        </td>                        <td className="py-4 px-4">{user.email}</td>
                        <td className="py-4 px-4">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={user.is_active ? "outline" : "destructive"}
                            className={
                              user.is_active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : ""
                            }
                          >
                            {user.is_active ? "Đang hoạt động" : "Bị khóa"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Mở menu</span>
                              </Button>
                            </DropdownMenuTrigger>                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewUserDetail(user.id)}
                              >
                                Xem chi tiết
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem> */}
                              <DropdownMenuSeparator />                              {user.is_active ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openDeactivateConfirm(user.id, `${user.first_name} ${user.last_name}`)
                                  }
                                  className="text-red-600"
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Khóa tài khoản
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActivateConfirm(user.id, `${user.first_name} ${user.last_name}`)
                                  }
                                  className="text-green-600"
                                >
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Mở khóa tài khoản
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}                  </tbody>
                </table>
                {usersData.total_pages > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Trước
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Trang {page} / {usersData.total_pages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setPage((p) => Math.min(usersData.total_pages, p + 1))
                        }
                        disabled={page === usersData.total_pages}
                      >
                        Tiếp
                      </Button>
                    </div>
                  </div>
                )}              </div>
            )}
          </CardContent>
        </Card>        {/* Confirmation Dialog for Account Actions */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "deactivate" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn {actionType === "deactivate" ? "khóa" : "mở khóa"} tài khoản của học viên <strong>{targetUserName}</strong>?
                {actionType === "deactivate" && (
                  <p className="mt-2 text-red-500">
                    Học viên sẽ không thể đăng nhập hoặc sử dụng hệ thống cho đến khi được mở khóa.
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDialogOpen(false)}
              >
                Không
              </Button>
              <Button
                type="button"
                variant={actionType === "deactivate" ? "destructive" : "default"}
                onClick={() => {
                  if (targetUserId) {
                    if (actionType === "deactivate") {
                      deactivateUser(targetUserId);
                    } else {
                      activateUser(targetUserId);
                    }
                  }
                  setConfirmDialogOpen(false);
                }}
              >
                Có
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết học viên</DialogTitle>
              <DialogDescription>
                Thông tin cá nhân và lịch sử học của học viên
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* Thông tin cá nhân */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={selectedUser.avatar}
                        alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                      />
                      <AvatarFallback className="text-lg">
                        {selectedUser.first_name[0]}
                        {selectedUser.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </h3>
                      <p className="text-muted-foreground">{selectedUser.email}</p>
                      <Badge
                        variant={selectedUser.is_active ? "outline" : "destructive"}
                        className={
                          selectedUser.is_active
                            ? "bg-green-100 text-green-800"
                            : ""
                        }
                      >
                        {selectedUser.is_active ? "Đang hoạt động" : "Bị khóa"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">

                    <div>
                      <span className="font-medium">Ngày tham gia:</span>
                      <span className="ml-2">{formatDate(selectedUser.created_at)}</span>
                    </div>
                  </div>
                </div>                {/* Lịch sử học theo khóa học */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Lịch sử học tập theo khóa học</h4>

                  {isLoadingBookings ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Đang tải lịch sử học...</span>
                    </div>
                  ) : bookingError ? (
                    <div className="text-center py-8 text-red-500">
                      <p>{bookingError}</p>
                    </div>
                  ) : bookingSummary.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Học viên chưa có lịch sử học nào</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-medium">Môn học</TableHead>
                            <TableHead className="font-medium">Tên khóa học</TableHead>
                            <TableHead className="font-medium">Gia sư</TableHead>
                            <TableHead className="font-medium text-center">Số buổi đã học</TableHead>
                            <TableHead className="font-medium text-center">Tổng số buổi</TableHead>
                            <TableHead className="font-medium text-center">Trạng thái chung</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookingSummary.map((summary, index) => (
                            <TableRow key={summary.course_id || index}>
                              <TableCell className="font-medium">
                                {summary.subject_name}
                              </TableCell>
                              <TableCell>
                                {summary.course_name}
                              </TableCell>
                              <TableCell>
                                {summary.tutor_name}
                              </TableCell>
                              <TableCell className="text-center">
                                {summary.completed_sessions}
                              </TableCell>
                              <TableCell className="text-center">
                                {summary.total_sessions}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={summary.overall_status === "completed" ? "default" : "outline"}
                                  className={
                                    summary.overall_status === "completed"
                                      ? "bg-green-100 text-green-800 border-green-300"
                                      : "bg-blue-100 text-blue-800 border-blue-300"
                                  }
                                >
                                  {summary.overall_status === "completed" ? "Hoàn thành" : "Đang diễn ra"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
