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
} from "lucide-react";

// Interface cho thống kê quản trị
interface AdminStats {
  total_users: number;
  active_tutors: number;
  total_courses: number;
  total_bookings: number;
}

// Interface cho hoạt động gần đây
interface RecentActivity {
  id: number;
  type: string;
  description: string;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
}

export default function AdminDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);

  // Truy vấn thống kê
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/v1/admin/stats"],
    enabled: false, // Disable API call for now
  });

  // Truy vấn hoạt động gần đây
  const { data: recentActivity, isLoading: activityLoading } = useQuery<
    RecentActivity[]
  >({
    queryKey: ["/api/v1/admin/recent-activity"],
    enabled: false, // Disable API call for now
  });
  // Không còn sử dụng dữ liệu mẫu nữa

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
  // Chỉ sử dụng dữ liệu API, không còn dùng dữ liệu mẫu
  const displayStats = stats;
  const displayRecentActivity = recentActivity;
  // Hiển thị loading khi đang tải dữ liệu
  if (statsLoading || activityLoading) {
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
  if (!stats || !recentActivity) {
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng người dùng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-primary mr-2" />
                  <span className="text-2xl font-bold">
                    {displayStats?.total_users || 0}
                  </span>
                </div>
                {displayStats?.total_users && displayStats.total_users > 0 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    12%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>{" "}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gia sư đang hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCheck className="h-5 w-5 text-primary mr-2" />
                  <span className="text-2xl font-bold">
                    {displayStats?.active_tutors || 0}
                  </span>
                </div>
                {displayStats?.active_tutors &&
                  displayStats.active_tutors > 0 && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      8%
                    </span>
                  )}
              </div>
            </CardContent>
          </Card>{" "}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Khóa học
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BookOpen className="h-5 w-5 text-primary mr-2" />
                  <span className="text-2xl font-bold">
                    {displayStats?.total_courses || 0}
                  </span>
                </div>
                {displayStats?.total_courses &&
                  displayStats.total_courses > 0 && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      15%
                    </span>
                  )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Đặt lịch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {" "}
                  <CalendarCheck className="h-5 w-5 text-primary mr-2" />
                  <span className="text-2xl font-bold">
                    {displayStats?.total_bookings || 0}
                  </span>
                </div>
                {displayStats?.total_bookings &&
                  displayStats.total_bookings > 0 && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      20%
                    </span>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Biểu đồ tăng trưởng */}
        <Card>
          <CardHeader>
            <CardTitle>Tăng trưởng nền tảng</CardTitle>
            <CardDescription>
              Tổng quan về tăng trưởng người dùng và hoạt động trong 30 ngày qua
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                Biểu đồ tăng trưởng sẽ được hiển thị ở đây
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hoạt động gần đây */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>
              Các hoạt động mới nhất trong hệ thống
            </CardDescription>
          </CardHeader>{" "}
          <CardContent>
            {!displayRecentActivity || displayRecentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Không có hoạt động gần đây
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayRecentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center py-2 border-b last:border-b-0"
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                      {activity.type === "verification" && (
                        <UserCheck className="h-5 w-5 text-primary" />
                      )}
                      {activity.type === "user" && (
                        <Users className="h-5 w-5 text-blue-500" />
                      )}
                      {activity.type === "booking" && (
                        <CalendarCheck className="h-5 w-5 text-green-500" />
                      )}
                      {activity.type === "course" && (
                        <BookOpen className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium">
                        {activity.description}
                      </p>
                      {activity.user && (
                        <div className="flex items-center mt-1">
                          <Avatar className="h-5 w-5 mr-1">
                            <AvatarImage
                              src={activity.user.avatar}
                              alt={`${activity.user.first_name} ${activity.user.last_name}`}
                            />
                            <AvatarFallback className="text-xs">
                              {activity.user.first_name[0]}
                              {activity.user.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {activity.user.first_name} {activity.user.last_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(activity.created_at)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
