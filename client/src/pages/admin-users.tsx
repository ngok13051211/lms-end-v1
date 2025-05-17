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
import { Loader2, Search, Filter, MoreHorizontal, UserPlus } from "lucide-react";

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

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Truy vấn danh sách người dùng
  const { data, isLoading, refetch } = useQuery<ApiResponse>({
    queryKey: [`users-list-${searchTerm}-${roleFilter}-${page}`],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/admin/users?search=${searchTerm}&role=${roleFilter === "all" ? "" : roleFilter}&page=${page}&limit=${pageSize}`,
        {
          credentials: 'include'
        }
      );
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu người dùng');
      }
      return response.json();
    },
  });

  // Dữ liệu mẫu
  const mockUsers: User[] = [
    {
      id: 1,
      first_name: "Nguyễn",
      last_name: "Văn A",
      email: "nguyenvana@example.com",
      role: "student",
      is_active: true,
      avatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A",
      created_at: "2025-04-15T10:30:00Z"
    },
    {
      id: 2,
      first_name: "Trần",
      last_name: "Thị B",
      email: "tranthib@example.com",
      role: "tutor",
      is_active: true,
      avatar: "https://ui-avatars.com/api/?name=Tran+Thi+B",
      created_at: "2025-04-10T14:25:00Z"
    },
    {
      id: 3,
      first_name: "Lê",
      last_name: "Văn C",
      email: "levanc@example.com",
      role: "student",
      is_active: false,
      avatar: "https://ui-avatars.com/api/?name=Le+Van+C",
      created_at: "2025-03-20T09:15:00Z"
    },
    {
      id: 4,
      first_name: "Phạm",
      last_name: "Thị D",
      email: "phamthid@example.com",
      role: "tutor",
      is_active: true,
      avatar: "https://ui-avatars.com/api/?name=Pham+Thi+D",
      created_at: "2025-02-05T11:20:00Z"
    },
    {
      id: 5,
      first_name: "Hoàng",
      last_name: "Văn E",
      email: "hoangvane@example.com",
      role: "admin",
      is_active: true,
      avatar: "https://ui-avatars.com/api/?name=Hoang+Van+E",
      created_at: "2025-01-10T16:45:00Z"
    }
  ];
  const mockResponse = {
    users: mockUsers,
    count: mockUsers.length,
    total_pages: 1,
    current_page: 1,
    success: true
  };

  const usersData = data || mockResponse;

  // Định dạng ngày giờ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  // Xử lý xem chi tiết người dùng
  const handleViewUserDetail = async (userId: number) => {
    try {
      console.log("User ID FEEE", userId);
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Không thể lấy thông tin chi tiết người dùng');
      }

      const data: UserDetailResponse = await response.json();
      setSelectedUser(data.user);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Lỗi khi lấy thông tin chi tiết người dùng:', error);
    }
  };

  // Xử lý khóa tài khoản người dùng
  const deactivateUser = async (userId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/deactivate`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Không thể khóa tài khoản người dùng');
      }

      // Cập nhật lại danh sách sau khi khóa tài khoản
      await refetch();

      alert('Đã khóa tài khoản người dùng thành công');
    } catch (error) {
      console.error('Lỗi khi khóa tài khoản người dùng:', error);
      alert('Đã xảy ra lỗi khi khóa tài khoản người dùng');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý tất cả người dùng trong hệ thống HomiTutor
            </p>
          </div>

          <div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Thêm người dùng
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm người dùng mới</DialogTitle>
                  <DialogDescription>
                    Điền thông tin để tạo tài khoản người dùng mới
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="text-sm font-medium">
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
                  </div>
                  <div>
                    <label htmlFor="role" className="text-sm font-medium">
                      Vai trò
                    </label>
                    <Select>
                      <SelectTrigger id="role" className="mt-1">
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Học viên</SelectItem>
                        <SelectItem value="tutor">Gia sư</SelectItem>
                        <SelectItem value="admin">Quản trị viên</SelectItem>
                      </SelectContent>
                    </Select>
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
          <CardHeader className="pb-3">
            <CardTitle>Danh sách người dùng</CardTitle>
            <CardDescription>
              Tổng cộng {usersData.users.length} người dùng
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm người dùng..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Lọc theo vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="student">Học viên</SelectItem>
                  <SelectItem value="tutor">Gia sư</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
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
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-4 px-4 font-medium">Người dùng</th>
                      <th className="py-4 px-4 font-medium">Email</th>
                      <th className="py-4 px-4 font-medium">Vai trò</th>
                      <th className="py-4 px-4 font-medium">Ngày tham gia</th>
                      <th className="py-4 px-4 font-medium">Trạng thái</th>
                      <th className="py-4 px-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage src={user.avatar} alt={`${user.first_name} ${user.last_name}`} />
                              <AvatarFallback>
                                {user.first_name[0]}
                                {user.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.first_name} {user.last_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">{user.email}</td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={
                              user.role === "admin"
                                ? "default"
                                : user.role === "tutor"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {user.role === "admin" ? "Quản trị viên" :
                              user.role === "tutor" ? "Gia sư" : "Học viên"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={user.is_active ? "success" : "destructive"}
                            className={user.is_active ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
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
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Hành động</DropdownMenuLabel>                              <DropdownMenuItem onClick={() => handleViewUserDetail(user.id)}>
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => user.is_active && deactivateUser(user.id)}
                                className={user.is_active ? "text-red-600" : "text-gray-400"}
                                disabled={!user.is_active}
                              >
                                {user.is_active ? "Khóa tài khoản" : "Đã bị khóa"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>                {usersData.total_pages > 1 && (
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
                          setPage((p) =>
                            Math.min(usersData.total_pages, p + 1)
                          )
                        }
                        disabled={page === usersData.total_pages}
                      >
                        Tiếp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>      </div>

      {/* Modal chi tiết người dùng */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết của người dùng trong hệ thống
            </DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedUser.avatar} alt={`${selectedUser.first_name} ${selectedUser.last_name}`} />
                    <AvatarFallback className="text-2xl">
                      {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Họ tên</h4>
                      <p className="text-base">{selectedUser.first_name} {selectedUser.last_name}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Tên đăng nhập</h4>
                      <p className="text-base">{selectedUser.username}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                      <p className="text-base">{selectedUser.email}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Vai trò</h4>
                      <Badge
                        variant={
                          selectedUser.role === "admin"
                            ? "default"
                            : selectedUser.role === "tutor"
                              ? "secondary"
                              : "outline"
                        }
                        className="mt-1"
                      >
                        {selectedUser.role === "admin" ? "Quản trị viên" :
                          selectedUser.role === "tutor" ? "Gia sư" : "Học viên"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Trạng thái</h4>
                      <Badge
                        variant={selectedUser.is_active ? "success" : "destructive"}
                        className={selectedUser.is_active ? "mt-1 bg-green-100 text-green-800 hover:bg-green-200" : "mt-1"}
                      >
                        {selectedUser.is_active ? "Đang hoạt động" : "Bị khóa"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Ngày tham gia</h4>
                      <p className="text-base">{formatDate(selectedUser.created_at)}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Cập nhật lần cuối</h4>
                      <p className="text-base">{formatDate(selectedUser.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.role === "tutor" && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium text-lg mb-3">Thông tin gia sư</h3>
                  <p className="text-muted-foreground text-sm">
                    Xem thêm trong trang quản lý gia sư
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Đang tải thông tin...</span>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Đóng
            </Button>

            {selectedUser?.is_active && selectedUser?.role !== "admin" && (
              <Button
                variant="destructive"
                onClick={() => {
                  deactivateUser(selectedUser.id);
                  setIsDetailModalOpen(false);
                }}
              >
                Khóa tài khoản
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
