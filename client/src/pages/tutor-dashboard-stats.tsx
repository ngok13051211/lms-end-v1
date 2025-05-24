import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  UserCheck,
  BookOpen,
  MessageSquare,
  Eye,
  Users,
  Star,
  BadgeCheck,
  LineChart,
  DollarSign,
} from "lucide-react";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  TimeFilter,
  TimeFilterParams,
} from "@/components/admin/TimeFilter";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TutorProfile {
  isVerified?: boolean;
  created_at?: string;
  subjects?: any[];
  educationLevels?: any[];
  hourlyRate?: number | string;
}

interface RevenueData {
  period: string;
  revenue: number;
}

export default function TutorDashboardStats() {
  // State cho bộ lọc thời gian doanh thu
  const [revenueFilterParams, setRevenueFilterParams] = useState<TimeFilterParams>({
    filterType: "month",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [shouldFetchRevenueData, setShouldFetchRevenueData] = useState(false);
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading } =
    useQuery<TutorProfile>({
      queryKey: [`/api/v1/tutors/profile`],
      retry: false,
    });

  // Define stats interface
  interface TutorStats {
    profile_status?: string;
    profile_views?: number;
    active_conversations?: number;
    rating?: number | string;
    reviews?: number;
    active_courses?: number;
    inactive_courses?: number;
    unread_messages?: number;
    response_rate?: number;
    average_response_time?: string;
    courses_created?: number;
  }

  // Get tutor's stats
  const { data: stats, isLoading: statsLoading } = useQuery<TutorStats>({
    queryKey: [`/api/v1/tutors/stats`],
    enabled: !!tutorProfile,
  });

  // Get tutor's revenue statistics
  const {
    data: revenueData,
    isLoading: isRevenueLoading,
    error: revenueError,
  } = useQuery<RevenueData[]>({
    queryKey: ["tutor-revenue-stats", revenueFilterParams],
    queryFn: async () => {
      try {
        let url = "/api/v1/tutors/statistics/revenue";
        const params = new URLSearchParams();

        // Add type parameter based on filter
        params.append("type", revenueFilterParams.filterType);

        // Add other parameters based on filter type
        switch (revenueFilterParams.filterType) {
          case "day":
            if (revenueFilterParams.fromDate) {
              params.append(
                "fromDate",
                format(revenueFilterParams.fromDate, "yyyy-MM-dd")
              );
            }
            if (revenueFilterParams.toDate) {
              params.append(
                "toDate",
                format(revenueFilterParams.toDate, "yyyy-MM-dd")
              );
            }
            break;
          case "month":
            if (revenueFilterParams.month) {
              params.append("month", revenueFilterParams.month.toString());
            }
            if (revenueFilterParams.year) {
              params.append("year", revenueFilterParams.year.toString());
            }
            break;
          case "year":
            if (revenueFilterParams.year) {
              params.append("year", revenueFilterParams.year.toString());
            }
            break;
        }

        const response = await fetch(`${url}?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch revenue data");
        }
        const data = await response.json();
        return data as RevenueData[];
      } catch (error) {
        console.error("Error fetching tutor revenue data:", error);
        throw error;
      }
    },
    enabled: shouldFetchRevenueData,
    refetchOnWindowFocus: false,
  });

  const isLoading = profileLoading || statsLoading;

  // Handle applying revenue filter
  const handleApplyRevenueFilter = (params: TimeFilterParams) => {
    setRevenueFilterParams(params);
    setShouldFetchRevenueData(true);
  };

  // Format revenue data for chart
  const formatRevenueChart = () => {
    if (!revenueData || revenueData.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: "Doanh thu (VND)",
            data: [],
            backgroundColor: "rgba(10, 179, 156, 0.5)",
            borderColor: "rgb(10, 179, 156)",
            tension: 0.3,
          },
        ],
      };
    }

    // Sort data by period (chronological order)
    const sortedData = [...revenueData].sort((a, b) => {
      return a.period.localeCompare(b.period);
    });

    // Format labels based on filter type
    const labels = sortedData.map((item) => {
      if (item.period.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Day format: YYYY-MM-DD
        const dateParts = item.period.split("-");
        return `${dateParts[2]}/${dateParts[1]}`;
      } else if (item.period.match(/^\d{4}-\d{2}$/)) {
        // Month format: YYYY-MM
        const monthParts = item.period.split("-");
        return `${monthParts[1]}/${monthParts[0]}`;
      } else {
        return item.period;
      }
    });

    // Check if all values are below 1 million for unit scaling
    const allValuesBelowOneMillion = sortedData.every(
      (item) => item.revenue < 1000000
    );

    const useThousandUnit = allValuesBelowOneMillion;
    const unit = useThousandUnit ? "nghìn VND" : "triệu VND";
    const divisor = useThousandUnit ? 1000 : 1000000;

    // Convert revenue to appropriate unit
    const values = sortedData.map((item) =>
      Number((item.revenue / divisor).toFixed(1))
    );

    return {
      labels,
      datasets: [
        {
          label: `Doanh thu (${unit})`,
          data: values,
          backgroundColor: "rgba(10, 179, 156, 0.5)",
          borderColor: "rgb(10, 179, 156)",
          tension: 0.3,
        },
      ],
      _config: {
        unit,
        useThousandUnit,
      },
    };
  };

  if (isLoading) {
    return (
      <TutorDashboardLayout activePage="stats">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading statistics...</span>
        </div>
      </TutorDashboardLayout>
    );
  }

  if (!tutorProfile) {
    return (
      <TutorDashboardLayout activePage="stats">
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <BadgeCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Hoàn thiện hồ sơ gia sư</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Bạn cần hoàn thiện hồ sơ gia sư trước khi xem thống kê. Hoàn thiện
            hồ sơ để bắt đầu nhận học viên.
          </p>
          <Button asChild>
            <Link href="/dashboard/tutor/profile">Hoàn thiện hồ sơ</Link>
          </Button>
        </div>
      </TutorDashboardLayout>
    );
  }

  return (
    <TutorDashboardLayout activePage="stats">
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Trạng thái hồ sơ
              </CardTitle>
              <BadgeCheck
                className={`h-4 w-4 ${tutorProfile.isVerified ? "text-green-500" : "text-yellow-500"
                  }`}
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.profile_status || "Chờ xác minh"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tutorProfile.isVerified
                  ? "Hồ sơ của bạn đã được xác minh"
                  : "Hồ sơ của bạn đang được xem xét"}
              </p>
            </CardContent>
          </Card>



          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Học viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.active_conversations || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Học viên đang trao đổi với bạn
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Đánh giá</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.rating
                  ? `${typeof stats.rating === "number"
                    ? stats.rating.toFixed(1)
                    : stats.rating
                  }/5.0`
                  : "Chưa có"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dựa trên {stats?.reviews || 0} đánh giá
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Khóa học</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {((stats?.active_courses || 0) + (stats?.inactive_courses || 0)) > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.active_courses || 0} / {(stats?.active_courses || 0) + (stats?.inactive_courses || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hiển thị: {stats?.active_courses || 0} / {(stats?.active_courses || 0) + (stats?.inactive_courses || 0)} khóa học
                  </p>

                </>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có khóa học nào</div>
              )}
              
            </CardContent>
          </Card>
        </div>

        {/* Revenue Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Thống kê doanh thu
            </CardTitle>
            <CardDescription>
              Xem biểu đồ doanh thu từ các buổi học đã hoàn thành
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Time Filter */}
            <div className="mb-6">
              <TimeFilter
                onApplyFilter={handleApplyRevenueFilter}
                className="border-none shadow-none"
              />
            </div>

            {/* Revenue Chart */}
            <div className="h-[350px]">
              {isRevenueLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Đang tải dữ liệu doanh thu...</span>
                </div>
              ) : revenueData && revenueData.length > 0 ? (
                (() => {
                  const chartData = formatRevenueChart();
                  const config = chartData._config || {
                    unit: "VND",
                    useThousandUnit: false,
                  };

                  return (
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top" as const,
                          },
                          title: {
                            display: true,
                            text: `Biểu đồ doanh thu theo thời gian`,
                          },
                          tooltip: {
                            callbacks: {
                              label: function (context: any) {
                                const value = context.parsed.y;
                                return `Doanh thu: ${value} ${config.unit}`;
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: config.useThousandUnit ? 50 : 0.5,
                            },
                            title: {
                              display: true,
                              text: `Doanh thu (${config.unit})`,
                            },
                          },
                          x: {
                            title: {
                              display: true,
                              text: "Thời gian",
                            },
                          },
                        },
                      }}
                    />
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <LineChart className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">
                      {shouldFetchRevenueData
                        ? "Không có dữ liệu doanh thu trong khoảng thời gian được chọn."
                        : "Chọn bộ lọc thời gian và nhấn nút Xem để hiển thị dữ liệu doanh thu."}
                    </p>
                    {!shouldFetchRevenueData && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Doanh thu được tính từ các buổi học đã hoàn thành.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TutorDashboardLayout>
  );
}
