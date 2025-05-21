import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Users,
  UserCheck,
  BookOpen,
  CalendarCheck,
  Clock,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import UserGrowthChart from "@/components/admin/UserGrowthChart";

// Interface cho thống kê tổng quan
interface DashboardOverview {
  totalUsers: number;
  totalStudents: number;
  studentsPercentage: number;
  activeTutors: number;
  tutorsPercentage: number;
  totalCourses: number;
  totalBookings: number;
}

// Interface cho hoạt động gần đây
interface RecentActivity {
  id: number;
  type: string;
  title?: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  tutorId?: number;
  studentId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
}

interface GroupedActivities {
  tutorVerifications: RecentActivity[];
  newUsers: RecentActivity[];
  newCourses: RecentActivity[];
  newBookings: RecentActivity[];
}

interface RecentActivitiesResponse {
  groupedActivities: GroupedActivities;
  recentActivities: RecentActivity[];
}

export default function AdminDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [error, setError] = useState<string | null>(null);

  // Truy vấn thống kê tổng quan
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery<DashboardOverview>({
    queryKey: ["adminDashboardOverview"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/v1/admin/summary/overview"
      );
      return await response.json();
    },
    onError: (error: Error) => {
      console.error("Lỗi khi lấy thống kê tổng quan:", error);
      setError("Không thể tải thông tin thống kê. Vui lòng thử lại sau.");
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 phút
  });

  // Truy vấn hoạt động gần đây
  const {
    data: recentActivitiesData,
    isLoading: activitiesLoading,
    isError: activitiesError,
  } = useQuery<RecentActivitiesResponse>({
    queryKey: ["adminRecentActivities"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/v1/admin/summary/recent-activities"
      );
      return await response.json();
    },
    onError: (error: Error) => {
      console.error("Lỗi khi lấy hoạt động gần đây:", error);
      setError("Không thể tải hoạt động gần đây. Vui lòng thử lại sau.");
    },
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 phút
  });

  // Định dạng ngày giờ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Kiểm tra lỗi và hiển thị thông báo
  if ((statsError || activitiesError) && error) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Hiển thị màn hình loading khi đang tải dữ liệu
  if (statsLoading && activitiesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Đang tải dữ liệu...</span>
        </div>
      </DashboardLayout>
    );
  }
  // Hiển thị thông báo khi không có dữ liệu
  if (!dashboardStats || !recentActivitiesData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Clock className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-medium mb-2">Chưa có dữ liệu</h2>
          <p className="text-muted-foreground">
            Dữ liệu thống kê sẽ được hiển thị khi hệ thống có hoạt động
          </p>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* <div>
          <h1 className="text-3xl font-bold tracking-tight">Xin chào, {user?.first_name}</h1>
          <p className="text-muted-foreground mt-1">
            Chào mừng đến với bảng điều khiển quản trị viên HomiTutor
          </p>
        </div> */}

        {/* Thống kê tổng quan */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Số lượng học viên */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Số lượng học viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-300 mr-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardStats?.totalStudents || 0}
                    </span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    {dashboardStats?.studentsPercentage || 0}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Số lượng gia sư */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Số lượng gia sư
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserCheck className="h-5 w-5 text-gray-300 mr-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserCheck className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardStats?.activeTutors || 0}
                    </span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    {dashboardStats?.tutorsPercentage || 0}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Khóa học đã tạo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Khóa học đã tạo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-gray-300 mr-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardStats?.totalCourses || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lượt đặt lịch */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lượt đặt lịch
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 text-gray-300 mr-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CalendarCheck className="h-5 w-5 text-primary mr-2" />
                    <span className="text-2xl font-bold">
                      {dashboardStats?.totalBookings || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Biểu đồ tăng trưởng */}
        <UserGrowthChart />

        {/* Hoạt động gần đây */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>
              Các hoạt động mới nhất trong hệ thống
            </CardDescription>
          </CardHeader>{" "}
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center py-2 border-b last:border-b-0"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="ml-4 flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : recentActivitiesData &&
              recentActivitiesData.recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivitiesData.recentActivities
                  .slice(0, 10)
                  .map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center py-2 border-b last:border-b-0"
                    >
                      <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                        {activity.type === "tutor_verification" && (
                          <UserCheck className="h-5 w-5 text-primary" />
                        )}
                        {activity.type === "new_user" && (
                          <Users className="h-5 w-5 text-blue-500" />
                        )}
                        {activity.type === "new_booking" && (
                          <CalendarCheck className="h-5 w-5 text-green-500" />
                        )}
                        {activity.type === "new_course" && (
                          <BookOpen className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        {activity.firstName && activity.lastName && (
                          <div className="flex items-center mt-1">
                            <Avatar className="h-5 w-5 mr-1">
                              <AvatarFallback className="text-xs">
                                {activity.firstName[0]}
                                {activity.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {activity.firstName} {activity.lastName}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                  ))}

                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    Xem thêm hoạt động
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Không có hoạt động gần đây
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
