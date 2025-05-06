import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck, BookOpen, MessageSquare, Eye, Users, Star, BadgeCheck } from "lucide-react";
import TutorDashboardLayout from "@/components/layout/TutorDashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

export default function TutorDashboardStats() {  
  // Get tutor profile
  const { data: tutorProfile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/v1/tutors/profile`],
    retry: false,
  });
  
  // Get tutor's stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/v1/tutors/stats`],
    enabled: !!tutorProfile,
  });

  const isLoading = profileLoading || statsLoading;

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
            Bạn cần hoàn thiện hồ sơ gia sư trước khi xem thống kê. Hoàn thiện hồ sơ để bắt đầu nhận học viên.
          </p>
          <Button asChild>
            <Link href="/dashboard/tutor/profile">
              Hoàn thiện hồ sơ
            </Link>
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
              <CardTitle className="text-sm font-medium">Trạng thái hồ sơ</CardTitle>
              <BadgeCheck className={`h-4 w-4 ${tutorProfile.isVerified ? "text-green-500" : "text-yellow-500"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.profile_status || "Chờ xác minh"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tutorProfile.isVerified 
                  ? "Hồ sơ của bạn đã được xác minh"
                  : "Hồ sơ của bạn đang được xem xét"
                }
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lượt xem hồ sơ</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.profile_views || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Số lượt xem hồ sơ của bạn
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Học viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active_conversations || 0}</div>
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
                  ? `${typeof stats.rating === 'number' 
                      ? stats.rating.toFixed(1) 
                      : stats.rating}/5.0` 
                  : "Chưa có"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dựa trên {stats?.reviews || 0} đánh giá
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Khóa học</CardTitle>
              <CardDescription>Số khóa học đang hoạt động</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Khóa học đang hiển thị
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.active_courses || 0} khóa học
                    </p>
                  </div>
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress value={(stats?.active_courses || 0) * 20} className="h-2" />
                  <span className="text-sm text-muted-foreground w-8">
                    {stats?.active_courses || 0}/5
                  </span>
                </div>
                
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/tutor/courses">
                    Quản lý khóa học
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tin nhắn</CardTitle>
              <CardDescription>Tin nhắn và tương tác với học viên</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Tin nhắn chưa đọc
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.unread_messages || 0} tin nhắn
                    </p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{stats?.active_conversations || 0}</span>
                    <span className="text-sm text-muted-foreground">Hội thoại</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold">{stats?.response_rate || 100}%</span>
                    <span className="text-sm text-muted-foreground">Tỉ lệ phản hồi</span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/tutor/messages">
                    Xem tin nhắn
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle>Thống kê hoạt động</CardTitle>
            <CardDescription>
              Tổng quan về hoạt động của bạn trên nền tảng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Chỉ số</th>
                    <th className="text-right py-3 font-medium">Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">Ngày tham gia</td>
                    <td className="text-right">
                      {tutorProfile?.created_at 
                        ? new Date(tutorProfile.created_at).toLocaleDateString('vi-VN')
                        : new Date().toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Thời gian phản hồi trung bình</td>
                    <td className="text-right">{stats?.average_response_time || "24 giờ"}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Số môn học</td>
                    <td className="text-right">{tutorProfile.subjects?.length || 0}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Số cấp độ giảng dạy</td>
                    <td className="text-right">{tutorProfile.educationLevels?.length || 0}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Khóa học đã tạo</td>
                    <td className="text-right">{stats?.courses_created || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-3">Học phí tham khảo</td>
                    <td className="text-right">
                      {tutorProfile?.hourlyRate 
                        ? new Intl.NumberFormat('vi-VN', { 
                            style: 'currency', 
                            currency: 'VND' 
                          }).format(Number(tutorProfile.hourlyRate)) + '/giờ'
                        : 'Chưa đặt'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Tips for improvement */}
        <Card>
          <CardHeader>
            <CardTitle>Gợi ý cải thiện</CardTitle>
            <CardDescription>
              Những cách để cải thiện hồ sơ và tăng khả năng nhận học viên
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {tutorProfile?.isVerified === false && (
                <li className="flex items-start">
                  <UserCheck className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Hoàn thiện hồ sơ xác minh</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Xác minh hồ sơ để tăng độ tin cậy và cơ hội nhận học viên.
                    </p>
                  </div>
                </li>
              )}
              
              {(stats?.active_ads || 0) < 3 && (
                <li className="flex items-start">
                  <BookOpen className="h-5 w-5 text-primary mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Tạo thêm khóa học</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tạo thêm khóa học cho các môn học và cấp độ khác nhau để tiếp cận nhiều học viên hơn.
                    </p>
                    <Button variant="link" className="px-0 h-auto mt-1" asChild>
                      <Link href="/dashboard/tutor/courses">
                        Tạo khóa học
                      </Link>
                    </Button>
                  </div>
                </li>
              )}
              
              <li className="flex items-start">
                <Star className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Yêu cầu đánh giá từ học viên</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Đánh giá tốt giúp tăng khả năng hiển thị hồ sơ và tạo niềm tin với học viên mới.
                  </p>
                </div>
              </li>
              
              <li className="flex items-start">
                <MessageSquare className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Phản hồi tin nhắn nhanh chóng</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Phản hồi nhanh chóng giúp tăng tỉ lệ chuyển đổi từ người quan tâm thành học viên.
                  </p>
                  <Button variant="link" className="px-0 h-auto mt-1" asChild>
                    <Link href="/dashboard/tutor/messages">
                      Kiểm tra tin nhắn
                    </Link>
                  </Button>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </TutorDashboardLayout>
  );
}