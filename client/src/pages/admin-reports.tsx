import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Loader2,
  Calendar as CalendarIcon,
  Download,
  BarChart3,
  LineChart,
  PieChart,
  Users,
  User,
  BookOpen,
  CalendarCheck,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


// Interface cho dữ liệu báo cáo
interface ReportData {
  // Dữ liệu cho báo cáo người dùng
  userStats: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    growthRate: number;
  };

  // Dữ liệu cho báo cáo gia sư
  tutorStats: {
    totalTutors: number;
    verifiedTutors: number;
    newTutors: number;
    averageRating: number;
    topSubjects: { name: string; count: number }[];
  };

  // Dữ liệu cho báo cáo đặt lịch
  bookingStats: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    revenue: number;
    monthlyBookings: { month: string; count: number }[];
  };
}

export default function AdminReports() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
    to: new Date()
  });

  const [reportType, setReportType] = useState("users");

  // Truy vấn dữ liệu báo cáo
  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/v1/admin/reports", reportType, timeRange],
    // Tắt để sử dụng dữ liệu mẫu
    enabled: false,
  });

  // Dữ liệu mẫu cho báo cáo
  const mockData: ReportData = {
    userStats: {
      totalUsers: 1205,
      newUsers: 127,
      activeUsers: 783,
      growthRate: 15.3,
    },
    tutorStats: {
      totalTutors: 87,
      verifiedTutors: 65,
      newTutors: 12,
      averageRating: 4.7,
      topSubjects: [
        { name: "Toán học", count: 32 },
        { name: "Tiếng Anh", count: 28 },
        { name: "Vật lý", count: 15 },
        { name: "Hóa học", count: 12 },
        { name: "Lập trình", count: 10 }
      ]
    },
    bookingStats: {
      totalBookings: 358,
      completedBookings: 289,
      cancelledBookings: 43,
      revenue: 24570000, // VND
      monthlyBookings: [
        { month: "T1", count: 24 },
        { month: "T2", count: 28 },
        { month: "T3", count: 32 },
        { month: "T4", count: 36 },
        { month: "T5", count: 42 }
      ]
    }
  };

  const reportData = data || mockData;

  // Định dạng số tiền VND
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Tạo chuỗi hiển thị cho khoảng thời gian
  const dateRangeText = timeRange?.from && timeRange?.to
    ? `${format(timeRange.from, 'dd/MM/yyyy')} - ${format(timeRange.to, 'dd/MM/yyyy')}`
    : "Chọn khoảng thời gian";

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Báo cáo thống kê</h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi và phân tích dữ liệu hoạt động của nền tảng
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRangeText}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={timeRange}
                  onSelect={setTimeRange}
                  locale={vi}
                  className="border rounded-md"
                />
              </PopoverContent>
            </Popover>

            <Button>
              <Download className="mr-2 h-4 w-4" />
              Xuất báo cáo
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" value={reportType} onValueChange={setReportType} className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Người dùng</TabsTrigger>
            <TabsTrigger value="tutors">Gia sư</TabsTrigger>
            <TabsTrigger value="bookings">Đặt lịch & Doanh thu</TabsTrigger>
          </TabsList>

          {/* Báo cáo người dùng */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng người dùng
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{reportData.userStats.totalUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Người dùng mới
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold">{reportData.userStats.newUsers}</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      {reportData.userStats.growthRate}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Người dùng hoạt động
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-2xl font-bold">{reportData.userStats.activeUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tỷ lệ tăng trưởng
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <ArrowUp className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-2xl font-bold">{reportData.userStats.growthRate}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tăng trưởng người dùng</CardTitle>
                <CardDescription>
                  Biểu đồ thể hiện số lượng người dùng mới đăng ký theo thời gian
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <LineChart className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    Biểu đồ tăng trưởng người dùng sẽ được hiển thị ở đây
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Báo cáo gia sư */}
          <TabsContent value="tutors" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng số gia sư
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{reportData.tutorStats.totalTutors}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gia sư đã xác minh
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{reportData.tutorStats.verifiedTutors}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Gia sư mới
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-2xl font-bold">{reportData.tutorStats.newTutors}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Đánh giá trung bình
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{reportData.tutorStats.averageRating}</span>
                    <span className="text-yellow-500 ml-2">★</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ môn học</CardTitle>
                  <CardDescription>
                    Thống kê gia sư theo môn học giảng dạy
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <PieChart className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      Biểu đồ phân bổ môn học sẽ được hiển thị ở đây
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Môn học phổ biến</CardTitle>
                  <CardDescription>
                    Các môn học có nhiều gia sư đăng ký giảng dạy nhất
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.tutorStats.topSubjects.map((subject, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="font-medium">{index + 1}.</span>
                          <span className="ml-2">{subject.name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">{subject.count}</span>
                          <span className="text-xs text-muted-foreground ml-1">gia sư</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Báo cáo đặt lịch & doanh thu */}
          <TabsContent value="bookings" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng đặt lịch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">{reportData.bookingStats.totalBookings}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Hoàn thành
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-2xl font-bold">{reportData.bookingStats.completedBookings}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Đã hủy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-2xl font-bold">{reportData.bookingStats.cancelledBookings}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Doanh thu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">{formatCurrency(reportData.bookingStats.revenue)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Đặt lịch theo tháng</CardTitle>
                <CardDescription>
                  Biểu đồ thể hiện số lượng đặt lịch theo tháng
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    Biểu đồ đặt lịch theo tháng sẽ được hiển thị ở đây
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
