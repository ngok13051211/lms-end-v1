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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Interface cho dữ liệu gia sư
interface Tutor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  education: string;
  experience: string;
  hourly_rate: number;
  is_verified: boolean;
  status: string;
  teaching_mode: string;
  average_rating: number;
  total_reviews: number;
  subjects: Array<{ id: number; name: string }>;
  education_levels: Array<{ id: number; name: string }>;
  avatar?: string;
  created_at: string;
}

interface TutorsResponse {
  tutors: Tutor[];
  totalPages: number;
}

export default function AdminTutors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  // Truy vấn danh sách gia sư
  const { data, isLoading } = useQuery<TutorsResponse>({
    queryKey: [
      `/api/v1/admin/tutors?search=${searchTerm}&status=${statusFilter}&page=${page}&pageSize=${pageSize}`,
    ],
    // Tắt API call để sử dụng dữ liệu mẫu
    enabled: false,
  });

  // Dữ liệu mẫu
  const mockTutors: Tutor[] = [
    {
      id: 1,
      user_id: 101,
      first_name: "Nguyễn",
      last_name: "Văn A",
      email: "nguyenvana@example.com",
      bio: "Tôi là giáo viên dạy Toán với hơn 5 năm kinh nghiệm. Tôi đam mê giúp học sinh phát triển tư duy logic và kỹ năng giải quyết vấn đề.",
      education: "Thạc sĩ Toán học, Đại học Sư phạm Hà Nội",
      experience: "5 năm dạy tại Trường THPT Chu Văn An\n3 năm dạy kèm tư nhân",
      hourly_rate: 250000,
      is_verified: true,
      status: "active",
      teaching_mode: "both",
      average_rating: 4.8,
      total_reviews: 24,
      subjects: [
        { id: 1, name: "Toán học" },
        { id: 2, name: "Vật lý" },
      ],
      education_levels: [
        { id: 1, name: "THCS" },
        { id: 2, name: "THPT" },
      ],
      avatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A",
      created_at: "2025-03-15T10:30:00Z",
    },
    {
      id: 2,
      user_id: 102,
      first_name: "Trần",
      last_name: "Thị B",
      email: "tranthib@example.com",
      bio: "Tôi là giáo viên dạy Tiếng Anh với kinh nghiệm giảng dạy quốc tế. Phương pháp dạy của tôi tập trung vào giao tiếp và ngữ pháp thực hành.",
      education: "Cử nhân Ngôn ngữ Anh, Đại học Ngoại ngữ Hà Nội",
      experience:
        "3 năm dạy tại Trung tâm Anh ngữ ILA\n2 năm dạy online qua Zoom",
      hourly_rate: 280000,
      is_verified: true,
      status: "active",
      teaching_mode: "online",
      average_rating: 4.9,
      total_reviews: 18,
      subjects: [{ id: 3, name: "Tiếng Anh" }],
      education_levels: [
        { id: 1, name: "THCS" },
        { id: 2, name: "THPT" },
      ],
      avatar: "https://ui-avatars.com/api/?name=Tran+Thi+B",
      created_at: "2025-02-20T14:25:00Z",
    },
    {
      id: 3,
      user_id: 103,
      first_name: "Lê",
      last_name: "Văn C",
      email: "levanc@example.com",
      bio: "Giảng viên đại học với chuyên môn về lập trình. Tôi có thể giúp học sinh từ cơ bản đến nâng cao về ngôn ngữ lập trình.",
      education: "Tiến sĩ Khoa học máy tính, Đại học Bách Khoa Hà Nội",
      experience:
        "7 năm giảng dạy tại Đại học FPT\n5 năm làm việc tại các công ty phần mềm",
      hourly_rate: 350000,
      is_verified: false,
      status: "pending",
      teaching_mode: "offline",
      average_rating: 0,
      total_reviews: 0,
      subjects: [
        { id: 4, name: "Lập trình" },
        { id: 5, name: "Tin học" },
      ],
      education_levels: [
        { id: 2, name: "THPT" },
        { id: 3, name: "Đại học" },
      ],
      avatar: "https://ui-avatars.com/api/?name=Le+Van+C",
      created_at: "2025-05-01T09:15:00Z",
    },
    {
      id: 4,
      user_id: 104,
      first_name: "Phạm",
      last_name: "Thị D",
      email: "phamthid@example.com",
      bio: "Giáo viên Hóa học với phương pháp giảng dạy dễ hiểu và thực tế. Tôi tập trung vào việc giúp học sinh hiểu sâu về các nguyên lý hóa học.",
      education: "Cử nhân Sư phạm Hóa học, Đại học Sư phạm Hà Nội",
      experience:
        "4 năm dạy tại Trường THPT Phan Đình Phùng\n2 năm dạy kèm nhóm",
      hourly_rate: 220000,
      is_verified: true,
      status: "active",
      teaching_mode: "both",
      average_rating: 4.5,
      total_reviews: 12,
      subjects: [{ id: 6, name: "Hóa học" }],
      education_levels: [{ id: 2, name: "THPT" }],
      avatar: "https://ui-avatars.com/api/?name=Pham+Thi+D",
      created_at: "2025-01-15T11:20:00Z",
    },
    {
      id: 5,
      user_id: 105,
      first_name: "Hoàng",
      last_name: "Văn E",
      email: "hoangvane@example.com",
      bio: "Chuyên gia về Ngữ văn với khả năng giúp học sinh phát triển tư duy phân tích và kỹ năng viết sáng tạo.",
      education:
        "Thạc sĩ Văn học Việt Nam, Đại học Khoa học Xã hội và Nhân văn",
      experience:
        "6 năm dạy tại Trường THPT Chu Văn An\n3 năm biên soạn tài liệu giáo khoa",
      hourly_rate: 230000,
      is_verified: false,
      status: "rejected",
      teaching_mode: "offline",
      average_rating: 0,
      total_reviews: 0,
      subjects: [{ id: 7, name: "Ngữ văn" }],
      education_levels: [
        { id: 1, name: "THCS" },
        { id: 2, name: "THPT" },
      ],
      avatar: "https://ui-avatars.com/api/?name=Hoang+Van+E",
      created_at: "2025-04-20T16:45:00Z",
    },
  ];

  const mockResponse: TutorsResponse = {
    tutors: mockTutors,
    totalPages: 1,
  };

  const tutorsData = data || mockResponse;

  // Lọc gia sư theo tab đang chọn
  const filteredTutors = tutorsData.tutors.filter((tutor) => {
    if (activeTab === "all") return true;
    if (activeTab === "verified") return tutor.is_verified;
    if (activeTab === "pending")
      return !tutor.is_verified && tutor.status === "pending";
    if (activeTab === "rejected")
      return !tutor.is_verified && tutor.status === "rejected";
    return true;
  });

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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Xử lý xem chi tiết gia sư
  const handleViewTutorDetails = (tutor: Tutor) => {
    setSelectedTutor(tutor);
  };

  // Xử lý xác minh/từ chối gia sư
  const handleVerifyTutor = async (tutorId: number) => {
    // Trong môi trường thực tế, gọi API để xác minh gia sư
    console.log(`Verify tutor ${tutorId}`);
  };

  const handleRejectTutor = async (tutorId: number) => {
    // Trong môi trường thực tế, gọi API để từ chối gia sư
    console.log(`Reject tutor ${tutorId}`);
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="verified">Đã xác minh</TabsTrigger>
            <TabsTrigger value="pending">Chờ xác minh</TabsTrigger>
            <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
          </TabsList>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Danh sách gia sư</CardTitle>
              <CardDescription>
                {filteredTutors.length} gia sư{" "}
                {activeTab === "all"
                  ? ""
                  : activeTab === "verified"
                  ? "đã xác minh"
                  : activeTab === "pending"
                  ? "đang chờ xác minh"
                  : "đã bị từ chối"}
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Lọc theo trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
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
                        <th className="py-4 px-4 font-medium">Gia sư</th>
                        <th className="py-4 px-4 font-medium">Môn học</th>
                        <th className="py-4 px-4 font-medium">Giá/giờ</th>
                        <th className="py-4 px-4 font-medium">Đánh giá</th>
                        <th className="py-4 px-4 font-medium">Trạng thái</th>
                        <th className="py-4 px-4 font-medium text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTutors.map((tutor) => (
                        <tr key={tutor.id} className="border-b">
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-3">
                                <AvatarImage
                                  src={tutor.avatar}
                                  alt={`${tutor.first_name} ${tutor.last_name}`}
                                />
                                <AvatarFallback>
                                  {tutor.first_name[0]}
                                  {tutor.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium block">
                                  {tutor.first_name} {tutor.last_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {tutor.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {tutor.subjects
                                .slice(0, 2)
                                .map((subject, index) => (
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
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {formatCurrency(tutor.hourly_rate)}
                          </td>
                          <td className="py-4 px-4">
                            {tutor.total_reviews > 0 ? (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">
                                  {tutor.average_rating}
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
                            ) : tutor.status === "pending" ? (
                              <Badge
                                variant="outline"
                                className="bg-yellow-50 text-yellow-800 border-yellow-300"
                              >
                                Chờ xác minh
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Đã từ chối</Badge>
                            )}
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
                                <DropdownMenuItem
                                  onClick={() => handleViewTutorDetails(tutor)}
                                >
                                  Xem chi tiết
                                </DropdownMenuItem>
                                {!tutor.is_verified &&
                                  tutor.status === "pending" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleVerifyTutor(tutor.id)
                                        }
                                        className="text-green-600"
                                      >
                                        Xác minh
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRejectTutor(tutor.id)
                                        }
                                        className="text-red-600"
                                      >
                                        Từ chối
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  Xem hồ sơ công khai
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {tutorsData.totalPages > 1 && (
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
                          Trang {page} / {tutorsData.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setPage((p) =>
                              Math.min(tutorsData.totalPages, p + 1)
                            )
                          }
                          disabled={page === tutorsData.totalPages}
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
        </Tabs>

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
                        alt={`${selectedTutor.first_name} ${selectedTutor.last_name}`}
                      />
                      <AvatarFallback className="text-2xl">
                        {selectedTutor.first_name[0]}
                        {selectedTutor.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-medium">
                      {selectedTutor.first_name} {selectedTutor.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTutor.email}
                    </p>

                    <div className="flex items-center mt-2">
                      {selectedTutor.is_verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          Đã xác minh
                        </Badge>
                      ) : selectedTutor.status === "pending" ? (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-800"
                        >
                          Chờ xác minh
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Đã từ chối</Badge>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Tham gia từ {formatDate(selectedTutor.created_at)}
                      </p>
                    </div>

                    {selectedTutor.total_reviews > 0 && (
                      <div className="flex items-center mt-2">
                        <span className="font-medium mr-1">
                          {selectedTutor.average_rating}
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
                      {selectedTutor.subjects.map((subject) => (
                        <Badge key={subject.id} variant="outline">
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Cấp độ giảng dạy</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTutor.education_levels.map((level) => (
                        <Badge key={level.id} variant="outline">
                          {level.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Hình thức dạy</h4>
                    <Badge variant="outline">
                      {selectedTutor.teaching_mode === "online"
                        ? "Trực tuyến"
                        : selectedTutor.teaching_mode === "offline"
                        ? "Trực tiếp"
                        : "Cả hai"}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Giá mỗi giờ</h4>
                    <p className="font-medium text-lg text-primary">
                      {formatCurrency(selectedTutor.hourly_rate)}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Giới thiệu</h4>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <p className="text-sm whitespace-pre-line">
                        {selectedTutor.bio}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Học vấn</h4>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <p className="text-sm whitespace-pre-line">
                        {selectedTutor.education}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Kinh nghiệm</h4>
                    <div className="bg-slate-50 p-4 rounded-md">
                      <p className="text-sm whitespace-pre-line">
                        {selectedTutor.experience}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Xem hồ sơ công khai
                </Button>

                {!selectedTutor.is_verified &&
                  selectedTutor.status === "pending" && (
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
                  )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
