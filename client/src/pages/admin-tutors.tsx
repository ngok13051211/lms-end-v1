import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Lock,
  Unlock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Interface cho dữ liệu gia sư
interface Tutor {
  id: number;
  full_name: string;
  email: string;
  avatar?: string;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  hourly_rate?: number;
  subjects: Array<{ id: number; name: string }>;
  levels: Array<{ id: number; name: string }>;
  created_at: string;
}

interface TutorsResponse {
  success: boolean;
  data?: {
    tutors: Tutor[];
    count: number;
    total_pages: number;
    current_page: number;
  };
  tutors?: Tutor[];
  count?: number;
  total_pages?: number;
  current_page?: number;
  message: string;
}

export default function AdminTutors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Truy vấn danh sách gia sư
  const { data, isLoading, error, refetch } = useQuery<TutorsResponse>({
    queryKey: [
      "admin-tutors-list",
      searchTerm,
      statusFilter,
      page,
      pageSize
    ],
    queryFn: async () => {
      const status = statusFilter !== "all" ? statusFilter : "";
      console.log(`Calling API: /api/v1/admin/tutors with search=${searchTerm}, status=${status}, page=${page}`);

      const response = await fetch(
        `/api/v1/admin/tutors?search=${encodeURIComponent(searchTerm || '')}&status=${status}&page=${page}&pageSize=${pageSize}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", errorText);
        throw new Error("Không thể tải dữ liệu gia sư");
      } const result = await response.json();
      console.log("API result:", result);
      return result;
    },
    staleTime: 30000 // 30 seconds
  });
  // Debug: kiểm tra cấu trúc dữ liệu
  console.log("Dữ liệu nhận được từ API:", data);

  // Xác định cấu trúc dữ liệu API (có thể là data.tutors hoặc trực tiếp tutors)
  const tutorsData = data?.data?.tutors || data?.tutors || [];
  console.log("Dữ liệu gia sư trích xuất:", tutorsData);

  // Lọc gia sư theo tab đang chọn
  const filteredTutors = tutorsData.filter((tutor: Tutor) => {
    if (activeTab === "all") return true;
    // Đảm bảo kiểm tra rõ ràng Boolean để tránh undefined
    if (activeTab === "verified") return tutor.is_verified === true;
    if (activeTab === "pending") return tutor.is_verified === false;
    return false;
  }) || [];

  console.log("Danh sách gia sư sau khi lọc:", filteredTutors);

  // Định dạng ngày giờ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Định dạng tiền tệ
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "Chưa thiết lập";

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };  // Xử lý xem chi tiết gia sư
  const handleViewTutorDetails = (tutor: Tutor) => {
    navigate(`/admin-dashboard/tutors/${tutor.id}`);
  };

  // Xử lý xác minh/từ chối gia sư
  const handleVerifyTutor = async (tutorId: number) => {
    // Trong môi trường thực tế, gọi API để xác minh gia sư
    console.log(`Verify tutor ${tutorId}`);
    await refetch();
  };
  const handleRejectTutor = async (tutorId: number) => {
    // Trong môi trường thực tế, gọi API để từ chối gia sư
    console.log(`Reject tutor ${tutorId}`);
    await refetch();
  };
  // State cho dialog xác nhận khóa/mở khóa tài khoản
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"deactivate" | "activate">("deactivate");
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetUserName, setTargetUserName] = useState<string>("");

  // Hàm mở dialog xác nhận khóa tài khoản
  const openDeactivateConfirm = (userId: number, userName: string) => {
    setTargetUserId(userId);
    setTargetUserName(userName);
    setActionType("deactivate");
    setConfirmDialogOpen(true);
  };

  // Hàm mở dialog xác nhận mở khóa tài khoản
  const openActivateConfirm = (userId: number, userName: string) => {
    setTargetUserId(userId);
    setTargetUserName(userName);
    setActionType("activate");
    setConfirmDialogOpen(true);
  };

  // Hàm xử lý khóa tài khoản gia sư
  const handleDeactivateTutor = async (userId: number) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/deactivate`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Không thể khóa tài khoản");
      }

      toast({
        title: "Thành công",
        description: "Đã khóa tài khoản của gia sư",
      });

      // Tải lại danh sách gia sư
      await refetch();
    } catch (error) {
      console.error("Lỗi khi khóa tài khoản:", error);
      toast({
        title: "Lỗi",
        description: "Không thể khóa tài khoản",
        variant: "destructive",
      });
    }
  };

  // Hàm xử lý mở khóa tài khoản gia sư
  const handleActivateTutor = async (userId: number) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/activate`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("Không thể mở khóa tài khoản");
      }

      toast({
        title: "Thành công",
        description: "Đã mở khóa tài khoản của gia sư",
      });

      // Tải lại danh sách gia sư
      await refetch();
    } catch (error) {
      console.error("Lỗi khi mở khóa tài khoản:", error);
      toast({
        title: "Lỗi",
        description: "Không thể mở khóa tài khoản",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Quản lý gia sư
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý tất cả gia sư trong hệ thống HomiTutor
            </p>
          </div>
        </div>        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Danh sách gia sư</CardTitle>
            <CardDescription>
              {filteredTutors.length} gia sư
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm gia sư..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Trạng thái xác minh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="verified">Đã xác minh</SelectItem>
                    <SelectItem value="pending">Chưa xác minh</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Trạng thái hoạt động" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Đang tải dữ liệu...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-red-500">
                Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.
              </div>
            ) : (
              <div className="overflow-x-auto">                  <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-4 px-4 font-medium">Gia sư</th>
                    <th className="py-4 px-4 font-medium">Môn học</th>
                    {/* <th className="py-4 px-4 font-medium">Giá/giờ</th> */}
                    <th className="py-4 px-4 font-medium">Đánh giá</th>
                    <th className="py-4 px-4 font-medium">Trạng thái xác minh</th>
                    <th className="py-4 px-4 font-medium">Trạng thái hoạt động</th>
                    <th className="py-4 px-4 font-medium text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTutors.length > 0 ? (
                    filteredTutors.map((tutor) => (
                      <tr key={tutor.id} className="border-b">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarImage
                                src={tutor.avatar}
                                alt={tutor.full_name}
                              />
                              <AvatarFallback>
                                {tutor.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium block">
                                {tutor.full_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {tutor.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {tutor.subjects.length > 0 ? (
                              <>
                                {tutor.subjects
                                  .slice(0, 2)
                                  .map((subject) => (
                                    <Badge
                                      key={subject.id}
                                      variant="outline"
                                      className="mr-1"
                                    >
                                      {subject.name}
                                    </Badge>
                                  ))}
                                {tutor.subjects.length > 2 && (
                                  <Badge variant="outline">
                                    +{tutor.subjects.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Chưa có môn học
                              </span>
                            )}
                          </div>
                        </td>
                        {/* <td className="py-4 px-4">
                            {tutor.hourly_rate ? (
                              <span className="font-medium">
                                {formatCurrency(tutor.hourly_rate)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Chưa thiết lập
                              </span>
                            )}
                          </td> */}
                        <td className="py-4 px-4">
                          {tutor.total_reviews > 0 ? (
                            <div className="flex items-center">
                              <span className="font-medium mr-1">
                                {tutor.rating}
                              </span>
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-muted-foreground ml-1">
                                ({tutor.total_reviews})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Chưa có đánh giá
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {tutor.is_verified ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Đã xác minh
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-800 border-yellow-300"
                            >
                              Chưa xác minh
                            </Badge>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant={tutor.is_active ? "outline" : "destructive"}
                            className={
                              tutor.is_active
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : ""
                            }
                          >
                            {tutor.is_active ? "Đang hoạt động" : "Ngừng hoạt động"}
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
                              <DropdownMenuSeparator />                                <DropdownMenuItem
                                onClick={() => navigate(`/admin-dashboard/tutors/${tutor.id}`)}
                              >
                                Xem chi tiết
                              </DropdownMenuItem>                              {tutor.is_active ? (
                                <DropdownMenuItem
                                  onClick={() => openDeactivateConfirm(tutor.id, tutor.full_name)}
                                  className="text-red-600"
                                >
                                  <Lock className="h-4 w-4 mr-2" />
                                  Khóa tài khoản
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => openActivateConfirm(tutor.id, tutor.full_name)}
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
                    ))
                  ) : (<tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy gia sư nào
                    </td>
                  </tr>
                  )}
                </tbody>
              </table>                  {data && ((data.total_pages ?? 1) > 1 || (data?.data?.total_pages ?? 1) > 1) && (
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
                      Trang {data.current_page || data?.data?.current_page} / {data.total_pages || data?.data?.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(data.total_pages || data?.data?.total_pages || 1, p + 1)
                        )
                      }
                      disabled={page === (data.total_pages || data?.data?.total_pages || 1)}
                    >
                      Tiếp
                    </Button>
                  </div>
                </div>
              )}                </div>
            )}
          </CardContent>
        </Card>

        {/* Chi tiết gia sư */}
        {selectedTutor && (
          <Dialog
            open={!!selectedTutor}
            onOpenChange={(open) => !open && setSelectedTutor(null)}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Chi tiết gia sư</DialogTitle>
                <DialogDescription>
                  Thông tin chi tiết về gia sư
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                <div>
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarImage
                        src={selectedTutor.avatar}
                        alt={selectedTutor.full_name}
                      />
                      <AvatarFallback className="text-2xl">
                        {selectedTutor.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-medium">
                      {selectedTutor.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTutor.email}
                    </p>

                    <div className="flex items-center mt-2">
                      {selectedTutor.is_verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          Đã xác minh
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-800"
                        >
                          Chưa xác minh
                        </Badge>
                      )}
                    </div>                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Tham gia từ {formatDate(selectedTutor.created_at)}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        Giá: {formatCurrency(selectedTutor.hourly_rate)}
                      </p>
                    </div>

                    {selectedTutor.total_reviews > 0 && (
                      <div className="flex items-center mt-2">
                        <span className="font-medium mr-1">
                          {selectedTutor.rating}
                        </span>
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-muted-foreground ml-1">
                          ({selectedTutor.total_reviews} đánh giá)
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h4 className="font-medium mb-2">Môn học</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTutor.subjects.length > 0 ? (
                        selectedTutor.subjects.map((subject) => (
                          <Badge key={subject.id} variant="outline">
                            {subject.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Chưa có môn học
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Cấp độ giảng dạy</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTutor.levels.length > 0 ? (
                        selectedTutor.levels.map((level) => (
                          <Badge key={level.id} variant="outline">
                            {level.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Chưa có cấp độ
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Thông tin gia sư</h4>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <p className="text-sm">
                        Email: {selectedTutor.email}
                      </p>
                      <p className="text-sm mt-2">
                        Trạng thái: {selectedTutor.is_active ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </p>
                      <p className="text-sm mt-2">
                        Ngày tạo: {formatDate(selectedTutor.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1" onClick={() => {
                    navigate(`/admin-dashboard/tutors/${selectedTutor.id}`);
                    setSelectedTutor(null);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Xem hồ sơ công khai
                </Button>                {!selectedTutor.is_verified && (
                  <>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleRejectTutor(selectedTutor.id);
                        setSelectedTutor(null);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Từ chối
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleVerifyTutor(selectedTutor.id);
                        setSelectedTutor(null);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Xác minh
                    </Button>
                  </>
                )}                {selectedTutor.is_active ? (
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      openDeactivateConfirm(selectedTutor.id, selectedTutor.full_name);
                      setSelectedTutor(null);
                    }}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Khóa tài khoản
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => {
                      openActivateConfirm(selectedTutor.id, selectedTutor.full_name);
                      setSelectedTutor(null);
                    }}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Mở khóa tài khoản
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>          </Dialog>
        )}

        {/* Confirmation Dialog for Account Actions */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "deactivate" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn {actionType === "deactivate" ? "khóa" : "mở khóa"} tài khoản của gia sư <strong>{targetUserName}</strong>?
                {actionType === "deactivate" && (
                  <p className="mt-2 text-red-500">
                    Gia sư sẽ không thể đăng nhập hoặc sử dụng hệ thống cho đến khi được mở khóa.
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
                      handleDeactivateTutor(targetUserId);
                    } else {
                      handleActivateTutor(targetUserId);
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
      </div>
    </DashboardLayout>
  );
}
