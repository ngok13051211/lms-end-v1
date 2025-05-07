import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Course, Subject } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Book,
  Clock,
  GraduationCap,
  MapPin,
  Users,
  Star,
  Calendar,
} from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  
  // Fetch subject details
  const { data: subject, isLoading: isLoadingSubject } = useQuery<Subject & {
    education_levels?: Array<{
      id: number;
      name: string;
    }>;
  }>({
    queryKey: ["/api/v1/subjects", id],
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
    queryKey: ["/api/v1/subjects", id, "courses"],
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
      <div className="bg-gradient-to-r from-primary-light to-primary rounded-lg p-8 mb-10 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center">
            <Book className="h-12 w-12" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{subject?.name}</h1>
            <p className="text-white/80 mb-4">{subject?.description}</p>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {subject?.education_levels?.map((level) => (
                <Badge key={level.id} className="bg-white/20 hover:bg-white/30">
                  {level.name}
                </Badge>
              ))}
            </div>
            
            <div className="flex flex-wrap mt-4 gap-6 justify-center md:justify-start">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                <span>{subject?.tutor_count || 0} gia sư</span>
              </div>
              <div className="flex items-center">
                <GraduationCap className="mr-2 h-5 w-5" />
                <span>{subject?.education_levels?.length || 0} cấp học</span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                <span>Trung bình {formatPrice(subject?.hourly_rate || 0)}/giờ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Courses Section */}
      <h2 className="text-2xl font-bold mb-6">Khóa học {subject?.name}</h2>
      
      {!courses?.courses?.length ? (
        <div className="text-center py-10 bg-muted/30 rounded-lg">
          <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Chưa có khóa học nào</h3>
          <p className="text-muted-foreground mb-6">
            Hiện chưa có gia sư nào đăng tải khóa học cho môn học này
          </p>
          <Button 
            onClick={() => window.location.href = "/tutor-dashboard/courses/new"}
            className="bg-primary hover:bg-primary-dark"
          >
            Đăng ký dạy môn này
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.courses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover-rise">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {course.tutor.user.avatar ? (
                      <img 
                        src={course.tutor.user.avatar} 
                        alt={`${course.tutor.user.first_name} ${course.tutor.user.last_name}`}
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <Users className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {course.tutor.user.first_name} {course.tutor.user.last_name}
                    </h3>
                    <div className="flex items-center text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="ml-1 text-sm">
                        {course.tutor.rating ? course.tutor.rating.toFixed(1) : "Chưa có đánh giá"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
                
                <div className="flex flex-wrap gap-y-2 gap-x-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>{formatPrice(course.hourly_rate)}/giờ</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="mr-1 h-4 w-4" />
                    <span>{formatTeachingMode(course.teaching_mode)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>
                      {new Date(course.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => window.location.href = `/courses/${course.id}`}
                  className="w-full bg-primary hover:bg-primary-dark"
                >
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