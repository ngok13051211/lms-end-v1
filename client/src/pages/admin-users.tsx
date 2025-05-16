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
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar?: string;
  created_at: string;
}

interface UsersResponse {
  users: User[];
  totalPages: number;
}

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Truy vấn danh sách người dùng
  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: [`/api/v1/admin/users?search=${searchTerm}&role=${roleFilter}&page=${page}&pageSize=${pageSize}`],
    // Tắt API call để sử dụng dữ liệu mẫu
    enabled: false,
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

  const mockResponse: UsersResponse = {
    users: mockUsers,
    totalPages: 1
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

  // Xử lý toggle trạng thái người dùng
  const toggleUserStatus = (userId: number, currentStatus: boolean) => {
    // Trong môi trường thực tế, gọi API để cập nhật trạng thái
    console.log(`Toggle user ${userId} status from ${currentStatus} to ${!currentStatus}`);
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
                              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                              <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                              <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                                className={user.is_active ? "text-red-600" : "text-green-600"}
                              >
                                {user.is_active ? "Khóa tài khoản" : "Kích hoạt"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {usersData.totalPages > 1 && (
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
                        Trang {page} / {usersData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setPage((p) =>
                            Math.min(usersData.totalPages, p + 1)
                          )
                        }
                        disabled={page === usersData.totalPages}
                      >
                        Tiếp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
