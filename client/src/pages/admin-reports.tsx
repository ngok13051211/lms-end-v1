import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
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
  DollarSign,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Import component TimeFilter
import { TimeFilter, TimeFilterParams, FilterType } from "@/components/admin/TimeFilter";
// Import component UserGrowthChart
import UserGrowthChart from "@/components/admin/UserGrowthChart";

// Đăng ký các component ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Interface cho dữ liệu người dùng tăng trưởng
interface MonthlyGrowthData {
  month: string;
  count: number;
  role?: string;
}

// Interface cho dữ liệu booking
interface BookingVolumeData {
  period: string;
  count: number;
  status?: string;
}

// Interface cho dữ liệu doanh thu
interface RevenueData {
  period: string;
  amount: number;
}

// Interface cho Top Tutors
interface TopTutorData {
  id: number;
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
}

// Interface cho thống kê trạng thái booking
interface BookingStatusData {
  status: string;
  count: number;
  percentage: number;
}

// Interface cho thống kê khóa học theo môn
interface CourseBySubjectData {
  subject: string;
  count: number;
  percentage?: number; // Making percentage optional as we'll calculate it
}

// Enum cho loại bộ lọc thời gian (giữ lại cho tương thích với code cũ)
type TimeFilterType = '7days' | '30days' | 'monthly';

export default function AdminReports() {
  // State cho bộ lọc thời gian (cũ - giữ lại để không ảnh hưởng đến các chức năng hiện tại)
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('7days');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // State cho bộ lọc thời gian mới
  const [filterParams, setFilterParams] = useState<TimeFilterParams>({
    filterType: 'month',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Biến theo dõi khi nào cần refetch dữ liệu
  const [shouldFetchData, setShouldFetchData] = useState(false);

  // State cho tab đang chọn
  const [activeTab, setActiveTab] = useState<string>('user-growth');
  const [activeDetailTab, setActiveDetailTab] = useState<string>('top-tutors');

  // Xử lý dữ liệu người dùng tăng trưởng
  const {
    data: userGrowthData,
    isLoading: isUserGrowthLoading,
    error: userGrowthError
  } = useQuery({
    queryKey: ["user-growth-stats", timeFilter, selectedMonth],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", '/api/v1/admin/summary/statistics/user-growth');
        const data = await response.json();
        return data as MonthlyGrowthData[];
      } catch (error) {
        console.error("Lỗi khi lấy thống kê tăng trưởng:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Xử lý dữ liệu booking volume
  const {
    data: bookingVolumeRawData,
    isLoading: isBookingVolumeLoading,
    error: bookingVolumeError
  } = useQuery({
    queryKey: ["booking-volume-stats", timeFilter, selectedMonth],
    queryFn: async () => {
      try {
        // Chuẩn bị các tham số cho API call
        let url = '/api/v1/admin/statistics/bookings-volume';
        const params = new URLSearchParams();

        // Xác định loại thống kê dựa trên bộ lọc thời gian
        let queryType = 'year';
        if (timeFilter === '7days' || timeFilter === '30days') {
          queryType = 'week';
        } else if (timeFilter === 'monthly') {
          queryType = 'month';
          if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            params.append('month', month);
            params.append('year', year);
          }
        }

        params.append('type', queryType);

        // Gọi API với tham số đã xác định
        const response = await apiRequest("GET", `${url}?${params.toString()}`);
        const data = await response.json();
        return data as BookingVolumeData[];
      } catch (error) {
        console.error("Lỗi khi lấy thống kê đặt lịch:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Định dạng dữ liệu booking volume cho biểu đồ
  const formatBookingVolumeChart = () => {
    if (!bookingVolumeRawData || bookingVolumeRawData.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Số lượng đặt lịch',
            data: [],
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
          }
        ]
      };
    }

    let labels = [];
    let data = [];

    // Xử lý dữ liệu theo loại thời gian
    if (timeFilter === 'monthly' && selectedMonth) {
      // Nếu là dữ liệu theo ngày trong tháng
      labels = bookingVolumeRawData.map(item => {
        const date = item.period.split('-')[2]; // Lấy phần ngày từ YYYY-MM-DD
        return `Ngày ${date}`;
      });
    } else if (timeFilter === '7days' || timeFilter === '30days') {
      // Nếu là dữ liệu theo tuần
      labels = bookingVolumeRawData.map(item => {
        const weekInfo = item.period.split('-')[1]; // Lấy số tuần từ YYYY-WW
        return `Tuần ${weekInfo}`;
      });
    } else {
      // Nếu là dữ liệu theo tháng trong năm
      labels = bookingVolumeRawData.map(item => {
        const month = parseInt(item.period.split('-')[1]); // Lấy tháng từ YYYY-MM
        return `T${month}`;
      });
    }

    data = bookingVolumeRawData.map(item => item.count);

    return {
      labels,
      datasets: [
        {
          label: 'Số lượng đặt lịch',
          data,
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgb(99, 102, 241)',
        }
      ]
    };
  };

  // Format dữ liệu người dùng tăng trưởng cho biểu đồ
  const formatUserGrowthChart = () => {
    if (!userGrowthData || userGrowthData.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Người dùng mới',
            data: [],
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
          }
        ]
      };
    }

    // Chuyển định dạng tháng
    const labels = userGrowthData.map(item => {
      const [year, month] = item.month.split('-');
      const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      return monthNames[parseInt(month) - 1];
    });

    const counts = userGrowthData.map(item => item.count);

    return {
      labels,
      datasets: [
        {
          label: 'Người dùng mới',
          data: counts,
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
        }
      ]
    };
  };

  // Các tùy chọn bộ lọc thời gian
  const timeFilterOptions = [
    { value: '7days', label: '7 ngày gần đây' },
    { value: '30days', label: '30 ngày' },
    { value: 'monthly', label: 'Theo tháng' },
  ];

  // Dữ liệu mẫu cho biểu đồ doanh thu
  const revenueData = {
    labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    datasets: [
      {
        label: 'Doanh thu (triệu VND)',
        data: [12, 19, 13, 15, 22, 27, 30, 35, 40, 38, 42, 50],
        backgroundColor: 'rgba(10, 179, 156, 0.5)',
        borderColor: 'rgb(10, 179, 156)',
        tension: 0.3,
      }
    ]
  };

  // Dữ liệu mẫu cho top tutors
  const topTutorsData = [
    { id: 1, name: 'Nguyễn Văn A', bookings: 45, revenue: 15.5, rating: 4.9 },
    { id: 2, name: 'Trần Thị B', bookings: 38, revenue: 12.8, rating: 4.8 },
    { id: 3, name: 'Lê Văn C', bookings: 32, revenue: 10.5, rating: 4.7 },
    { id: 4, name: 'Phạm Thị D', bookings: 30, revenue: 9.8, rating: 4.6 },
    { id: 5, name: 'Hoàng Văn E', bookings: 28, revenue: 9.2, rating: 4.5 },
  ];

  // Dữ liệu mẫu cho trạng thái booking
  const bookingStatusData = {
    labels: ['Chờ xác nhận', 'Đã xác nhận', 'Đang diễn ra', 'Hoàn thành', 'Đã hủy'],
    datasets: [
      {
        data: [15, 25, 20, 30, 10],
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',   // Chờ xác nhận
          'rgba(54, 162, 235, 0.7)',    // Đã xác nhận
          'rgba(75, 192, 192, 0.7)',    // Đang diễn ra
          'rgba(10, 179, 156, 0.7)',    // Hoàn thành
          'rgba(255, 99, 132, 0.7)',    // Đã hủy
        ],
        borderColor: [
          'rgb(255, 159, 64)',
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(10, 179, 156)',
          'rgb(255, 99, 132)',
        ],
        borderWidth: 1,
      }
    ]
  };
  // Fetch khóa học theo môn từ API
  const {
    data: rawCoursesBySubject,
    isLoading: isCoursesBySubjectLoading,
    error: coursesBySubjectError
  } = useQuery({
    queryKey: ["courses-by-subject-stats"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", '/api/v1/admin/statistics/courses-by-subject');
        const data = await response.json();

        // Tính toán tỷ lệ phần trăm cho mỗi môn học
        const total = data.reduce((sum: number, item: CourseBySubjectData) => sum + item.count, 0);
        return data.map((item: CourseBySubjectData) => ({
          ...item,
          percentage: Math.round((item.count / total) * 100)
        }));
      } catch (error) {
        console.error("Lỗi khi lấy thống kê khóa học theo môn:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
  });

  // Chuẩn bị dữ liệu cho biểu đồ pie chart
  const coursesBySubjectData = {
    labels: rawCoursesBySubject ? rawCoursesBySubject.map((item: CourseBySubjectData) => item.subject) : [],
    datasets: [
      {
        data: rawCoursesBySubject ? rawCoursesBySubject.map((item: CourseBySubjectData) => item.count) : [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(201, 203, 207, 0.7)',
          'rgba(128, 0, 128, 0.7)',
          'rgba(0, 128, 0, 0.7)',
          'rgba(128, 128, 0, 0.7)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 206, 86)',
          'rgb(75, 192, 192)',
          'rgb(153, 102, 255)',
          'rgb(255, 159, 64)',
          'rgb(201, 203, 207)'
        ],
        borderWidth: 1,
      }
    ]
  };

  // Xử lý booking volume với bộ lọc mới
  const {
    data: advancedBookingVolumeData,
    isLoading: isAdvancedBookingVolumeLoading,
    error: advancedBookingVolumeError,
    refetch: refetchBookingVolume
  } = useQuery({
    queryKey: ["advanced-booking-volume-stats", filterParams],
    queryFn: async () => {
      try {
        // Chuẩn bị các tham số cho API call
        let url = '/api/v1/admin/statistics/bookings-volume';
        const params = new URLSearchParams();

        // Xác định loại thống kê dựa trên loại bộ lọc
        switch (filterParams.filterType) {
          case 'day':
            // Nếu lọc theo ngày
            params.append('type', 'day');
            if (filterParams.fromDate) {
              params.append('fromDate', format(filterParams.fromDate, 'yyyy-MM-dd'));
            }
            if (filterParams.toDate) {
              params.append('toDate', format(filterParams.toDate, 'yyyy-MM-dd'));
            }
            break;

          case 'month':
            // Nếu lọc theo tháng
            params.append('type', 'month');
            if (filterParams.month) {
              params.append('month', filterParams.month.toString());
            }
            if (filterParams.year) {
              params.append('year', filterParams.year.toString());
            }
            break;

          case 'year':
            // Nếu lọc theo năm
            params.append('type', 'year');
            if (filterParams.year) {
              params.append('year', filterParams.year.toString());
            }
            break;
        }

        // Gọi API với tham số đã xác định
        const response = await apiRequest("GET", `${url}?${params.toString()}`);
        const data = await response.json();
        return data as BookingVolumeData[];
      } catch (error) {
        console.error("Lỗi khi lấy thống kê đặt lịch:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    enabled: shouldFetchData, // Chỉ gọi API khi shouldFetchData = true
  });

  // Định dạng dữ liệu booking volume từ bộ lọc nâng cao cho biểu đồ
  const formatAdvancedBookingVolumeChart = () => {
    if (!advancedBookingVolumeData || advancedBookingVolumeData.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Số lượng đặt lịch',
            data: [],
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
          }
        ]
      };
    }

    let labels: string[] = [];
    let data: number[] = [];

    // Xử lý dữ liệu theo loại bộ lọc
    switch (filterParams.filterType) {
      case 'day':
        // Nếu là dữ liệu theo ngày
        labels = advancedBookingVolumeData.map(item => {
          // Dự kiến period có định dạng "YYYY-MM-DD"
          const parts = item.period.split('-');
          return `${parts[2]}/${parts[1]}`; // Format: DD/MM
        });
        break;

      case 'month':
        // Nếu là dữ liệu theo ngày trong tháng
        labels = advancedBookingVolumeData.map(item => {
          const date = item.period.split('-')[2]; // Lấy phần ngày từ YYYY-MM-DD
          return `Ngày ${date}`;
        });
        break;

      case 'year':
        // Nếu là dữ liệu theo tháng trong năm
        labels = advancedBookingVolumeData.map(item => {
          const month = parseInt(item.period.split('-')[1]); // Lấy tháng từ YYYY-MM
          return `T${month}`;
        });
        break;
    }

    data = advancedBookingVolumeData.map(item => item.count);

    return {
      labels,
      datasets: [
        {
          label: 'Số lượng đặt lịch',
          data,
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgb(99, 102, 241)',
        }
      ]
    };
  };

  // Xử lý khi người dùng áp dụng bộ lọc
  const handleApplyFilter = (params: TimeFilterParams) => {
    setFilterParams(params);
    setShouldFetchData(true); // Trigger việc fetch dữ liệu
  };

  // Reset trạng thái shouldFetchData sau khi đã fetch dữ liệu
  useEffect(() => {
    if (shouldFetchData) {
      setShouldFetchData(false);
    }
  }, [shouldFetchData, advancedBookingVolumeData]);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">📊 Báo cáo thống kê</h1>
            <p className="text-muted-foreground">
              Xem thống kê chi tiết về hoạt động của hệ thống HomiTutor
            </p>
          </div>

          {/* Button xuất báo cáo */}
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Xuất báo cáo
          </Button>
        </div>        {/* Bộ lọc thời gian mới */}
        <TimeFilter onApplyFilter={handleApplyFilter} />

        {/* Bộ lọc thời gian cũ - giữ lại cho các tab khác */}
        <Card className="hidden">
          <CardHeader className="pb-3">
            <CardTitle>Bộ lọc thời gian (Cũ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Select value={timeFilter} onValueChange={value => setTimeFilter(value as TimeFilterType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khoảng thời gian" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeFilterOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {timeFilter === 'monthly' && (
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tháng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-01">Tháng 1/2025</SelectItem>
                      <SelectItem value="2025-02">Tháng 2/2025</SelectItem>
                      <SelectItem value="2025-03">Tháng 3/2025</SelectItem>
                      <SelectItem value="2025-04">Tháng 4/2025</SelectItem>
                      <SelectItem value="2025-05">Tháng 5/2025</SelectItem>
                      <SelectItem value="2025-06">Tháng 6/2025</SelectItem>
                      <SelectItem value="2025-07">Tháng 7/2025</SelectItem>
                      <SelectItem value="2025-08">Tháng 8/2025</SelectItem>
                      <SelectItem value="2025-09">Tháng 9/2025</SelectItem>
                      <SelectItem value="2025-10">Tháng 10/2025</SelectItem>
                      <SelectItem value="2025-11">Tháng 11/2025</SelectItem>
                      <SelectItem value="2025-12">Tháng 12/2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Biểu đồ tổng hợp */}
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ tổng hợp</CardTitle>
            <CardDescription>
              Thống kê tổng quan về hoạt động của hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user-growth" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="user-growth">User Growth</TabsTrigger>
                <TabsTrigger value="booking-volume">Booking Volume</TabsTrigger>
                <TabsTrigger value="revenue-chart">Revenue Chart</TabsTrigger>
              </TabsList>              {/* Biểu đồ User Growth */}
              <TabsContent value="user-growth">
                <div className="h-[350px]">
                  <UserGrowthChart filterParams={filterParams} />
                </div>
              </TabsContent>{/* Biểu đồ Booking Volume */}
              <TabsContent value="booking-volume">
                <div className="h-[350px]">
                  {isAdvancedBookingVolumeLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">Đang tải dữ liệu...</span>
                    </div>
                  ) : advancedBookingVolumeData && advancedBookingVolumeData.length > 0 ? (
                    <Bar
                      data={formatAdvancedBookingVolumeChart()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                          title: {
                            display: true,
                            text: 'Số lượng đặt lịch theo thời gian',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">
                          {shouldFetchData
                            ? "Đang tải dữ liệu..."
                            : "Chọn bộ lọc thời gian và nhấn nút Xem để hiển thị dữ liệu."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Biểu đồ Revenue */}
              <TabsContent value="revenue-chart">
                <div className="h-[350px]">
                  <Line
                    data={revenueData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                        title: {
                          display: true,
                          text: 'Doanh thu theo tháng (triệu VND)',
                        },
                      },
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Phân tích chi tiết */}
        <Card>
          <CardHeader>
            <CardTitle>Phân tích chi tiết</CardTitle>
            <CardDescription>
              Thông tin chi tiết về các khía cạnh hoạt động
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="top-tutors" value={activeDetailTab} onValueChange={setActiveDetailTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="top-tutors">Top Tutors</TabsTrigger>
                <TabsTrigger value="booking-status">Trạng thái đặt lịch</TabsTrigger>
                <TabsTrigger value="courses-by-subject">Khóa học theo môn</TabsTrigger>
              </TabsList>

              {/* Bảng Top Tutors */}
              <TabsContent value="top-tutors">
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Tên gia sư</TableHead>
                        <TableHead>Số lượt đặt</TableHead>
                        <TableHead>Doanh thu (triệu)</TableHead>
                        <TableHead>Đánh giá</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topTutorsData.map((tutor) => (
                        <TableRow key={tutor.id}>
                          <TableCell className="font-medium">{tutor.id}</TableCell>
                          <TableCell>{tutor.name}</TableCell>
                          <TableCell>{tutor.bookings}</TableCell>
                          <TableCell>{tutor.revenue.toFixed(1)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              ★ {tutor.rating.toFixed(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Biểu đồ trạng thái đặt lịch */}
              <TabsContent value="booking-status">
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="w-full md:w-1/2 h-[300px]">
                    <Pie
                      data={bookingStatusData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right' as const,
                          },
                          title: {
                            display: true,
                            text: 'Phân bố trạng thái đặt lịch',
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Số lượng</TableHead>
                          <TableHead>Tỷ lệ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Chờ xác nhận</TableCell>
                          <TableCell>15</TableCell>
                          <TableCell>15%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Đã xác nhận</TableCell>
                          <TableCell>25</TableCell>
                          <TableCell>25%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Đang diễn ra</TableCell>
                          <TableCell>20</TableCell>
                          <TableCell>20%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Hoàn thành</TableCell>
                          <TableCell>30</TableCell>
                          <TableCell>30%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Đã hủy</TableCell>
                          <TableCell>10</TableCell>
                          <TableCell>10%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* Biểu đồ khóa học theo môn */}              <TabsContent value="courses-by-subject">
                <div className="flex flex-col md:flex-row md:items-center gap-8">
                  <div className="w-full md:w-1/2 h-[300px]">
                    {isCoursesBySubjectLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2">Đang tải dữ liệu...</span>
                      </div>
                    ) : coursesBySubjectError ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <PieChart className="h-16 w-16 mx-auto text-muted-foreground" />
                          <p className="mt-4 text-muted-foreground">
                            Có lỗi khi tải dữ liệu khóa học theo môn.
                          </p>
                        </div>
                      </div>
                    ) : rawCoursesBySubject && rawCoursesBySubject.length > 0 ? (
                      <Pie
                        data={coursesBySubjectData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'right' as const,
                            },
                            title: {
                              display: true,
                              text: 'Khóa học theo môn học',
                            },
                          },
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <PieChart className="h-16 w-16 mx-auto text-muted-foreground" />
                          <p className="mt-4 text-muted-foreground">
                            Không có dữ liệu khóa học theo môn.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-1/2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Môn học</TableHead>
                          <TableHead>Số lượng khóa học</TableHead>
                          <TableHead>Tỷ lệ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isCoursesBySubjectLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">
                              <Loader2 className="h-4 w-4 animate-spin text-primary inline mr-2" />
                              Đang tải dữ liệu...
                            </TableCell>
                          </TableRow>
                        ) : rawCoursesBySubject && rawCoursesBySubject.length > 0 ? (
                          rawCoursesBySubject.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.subject}</TableCell>
                              <TableCell>{item.count}</TableCell>
                              <TableCell>{item.percentage}%</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">Không có dữ liệu</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
