import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Course, Subject } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Book,
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Users,
  Star,
  Plus,
} from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  
  // Get current user
  const { data: userData } = useQuery<{
    user?: {
      id: number;
      role: string;
    }
  }>({
    queryKey: ["/api/v1/auth/me"],
  });
  
  const isLoggedIn = !!userData?.user;
  const isTutor = userData?.user?.role === "tutor";
  
  // Fetch subject details
  const { data: subject, isLoading: isLoadingSubject } = useQuery<Subject & {
    education_levels?: Array<{
      id: number;
      name: string;
    }>;
    tutor_count?: number;
  }>({
    queryKey: [`/api/v1/subjects/${id}`],
    enabled: !!id,
  });
  
  // Fetch courses for this subject
  const { data: courses, isLoading: isLoadingCourses } = useQuery<{
    courses: (Course & {
      tutor: {
        id: number;
        user: {
          id: number;
          first_name: string;
          last_name: string;
          avatar: string | null;
        };
        rating: number | null;
      };
    })[];
  }>({
    queryKey: [`/api/v1/subjects/${id}/courses`],
    enabled: !!id,
  });
  
  const isLoading = isLoadingSubject || isLoadingCourses;
  
  const formatPrice = (price: number | string) => {
    if (!price) return "Thỏa thuận";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };
  
  const formatTeachingMode = (mode: string) => {
    switch (mode) {
      case "online":
        return "Trực tuyến";
      case "offline":
        return "Tại nhà";
      case "both":
        return "Trực tuyến & Tại nhà";
      default:
        return mode;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container max-w-7xl py-10">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-7xl py-10">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/subjects">Môn học</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>{subject?.name}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      {/* Subject Header */}
      <div className="bg-gradient-to-r from-primary-light to-primary rounded-xl shadow-lg p-8 mb-10 text-white">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-28 w-28 bg-white/20 rounded-full flex items-center justify-center shadow-inner shadow-black/20 transition-all duration-300 hover:scale-105">
            <Book className="h-14 w-14" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{subject?.name}</h1>
            <p className="text-white/90 mb-5 text-lg max-w-3xl">{subject?.description}</p>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-5">
              {subject?.education_levels?.map((level) => (
                <Badge key={level.id} className="bg-white/20 hover:bg-white/30 px-3 py-1 text-sm font-medium">
                  {level.name}
                </Badge>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-black/10 p-4 rounded-lg">
              <div className="flex items-center bg-white/10 rounded-md p-3 backdrop-blur-sm">
                <Users className="mr-3 h-6 w-6 text-yellow-200" />
                <div>
                  <div className="text-lg font-semibold">{subject?.tutor_count || 0}</div>
                  <div className="text-xs text-white/70">Gia sư hiện có</div>
                </div>
              </div>
              <div className="flex items-center bg-white/10 rounded-md p-3 backdrop-blur-sm">
                <GraduationCap className="mr-3 h-6 w-6 text-yellow-200" />
                <div>
                  <div className="text-lg font-semibold">{subject?.education_levels?.length || 0}</div>
                  <div className="text-xs text-white/70">Cấp học</div>
                </div>
              </div>
              <div className="flex items-center bg-white/10 rounded-md p-3 backdrop-blur-sm">
                <Clock className="mr-3 h-6 w-6 text-yellow-200" />
                <div>
                  <div className="text-lg font-semibold">{formatPrice(subject?.hourly_rate || 0)}</div>
                  <div className="text-xs text-white/70">Học phí trung bình/giờ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Courses Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Khóa học {subject?.name}</h2>
        
        {isTutor && (
          <Button 
            onClick={() => window.location.href = `/tutor-dashboard/courses?subject_id=${id}`}
            className="bg-primary hover:bg-primary-dark"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo khóa học mới
          </Button>
        )}
      </div>
      
      {!courses?.courses?.length ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl shadow-sm border border-border/50">
          <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Book className="h-10 w-10 text-primary opacity-70" />
          </div>
          <h3 className="text-2xl font-medium mb-3">Chưa có khóa học nào</h3>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Hiện chưa có gia sư nào đăng tải khóa học cho môn học này
          </p>
          
          {isTutor && (
            <Button 
              onClick={() => window.location.href = `/tutor-dashboard/courses?subject_id=${id}`}
              className="bg-primary hover:bg-primary-dark px-6 py-6 h-auto text-base font-medium"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Tạo khóa học mới cho môn này
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {courses.courses.map((course) => (
            <Card key={course.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-border/60">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border/50">
                  <div className="h-14 w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-primary/20">
                    {course.tutor.user.avatar ? (
                      <img 
                        src={course.tutor.user.avatar} 
                        alt={`${course.tutor.user.first_name} ${course.tutor.user.last_name}`}
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <Users className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">
                      {course.tutor.user.first_name} {course.tutor.user.last_name}
                    </h3>
                    <div className="flex items-center text-amber-500">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-500" />
                      <Star className="h-4 w-4 fill-amber-100" />
                      <span className="ml-2 text-sm font-medium">
                        {course.tutor.rating ? course.tutor.rating.toFixed(1) : "Chưa có đánh giá"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{course.title}</h3>
                <p className="text-muted-foreground mb-5 line-clamp-2">{course.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="flex items-center bg-muted/50 rounded-lg p-3">
                    <div className="bg-primary/10 rounded-md h-8 w-8 flex items-center justify-center mr-3">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Học phí</div>
                      <div className="font-semibold">{formatPrice(course.hourly_rate)}/giờ</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-muted/50 rounded-lg p-3">
                    <div className="bg-primary/10 rounded-md h-8 w-8 flex items-center justify-center mr-3">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Hình thức</div>
                      <div className="font-semibold">{formatTeachingMode(course.teaching_mode)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-muted/50 rounded-lg p-3">
                    <div className="bg-primary/10 rounded-md h-8 w-8 flex items-center justify-center mr-3">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Ngày tạo</div>
                      <div className="font-semibold">{new Date(course.created_at).toLocaleDateString("vi-VN")}</div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => window.location.href = `/courses/${course.id}`}
                  className="w-full bg-primary hover:bg-primary-dark h-12 text-base font-medium"
                  size="lg"
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Xem chi tiết và đặt lịch
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}