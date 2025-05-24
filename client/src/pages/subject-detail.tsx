import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { subjects, courses } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import LoginDialog from "@/components/auth/LoginDialog";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

// Định nghĩa kiểu Subject dựa trên schema subjects
type Subject = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  tutor_count?: number;
  teaching_mode?: string;
  hourly_rate?: number | string;
  created_at?: string;
  updated_at?: string;
  education_levels?: Array<{
    id: number;
    name: string;
  }>;
};

// Định nghĩa kiểu Course dựa trên schema courses
type Course = {
  id: number;
  tutor_id: number;
  subject_id: number;
  level_id: number;
  title: string;
  description?: string | null;
  hourly_rate: number;
  teaching_mode: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  tutor?: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      avatar: string | null;
    };
    rating: number | null;
    is_verified: boolean;
  };
  subject?: {
    name: string;
  };
  level?: {
    name: string;
  };
  teachingMode?: string;
  hourlyRate?: number;
};

import {
  Book,
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Users,
  Star,
  Plus,
  CheckCircle,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [pendingBookingUrl, setPendingBookingUrl] = useState<string | null>(
    null
  );

  // Get current user from Redux store
  const user = useSelector((state: RootState) => state.auth.user);

  const isLoggedIn = !!user;
  const isTutor = user?.role === "tutor";

  // Handle booking with login check
  const handleBooking = (
    tutorId: number,
    courseId: number,
    courseTitle: string
  ) => {
    const bookingUrl = `/book/${tutorId}?course=${courseId}`;

    if (!isLoggedIn) {
      // Store the booking URL and show login dialog
      setPendingBookingUrl(bookingUrl);
      setIsLoginDialogOpen(true);
    } else {
      // User is logged in, navigate directly to booking
      navigate(bookingUrl);
    }
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsLoginDialogOpen(false);

    // Navigate to the pending booking URL if available
    if (pendingBookingUrl) {
      navigate(pendingBookingUrl);
      setPendingBookingUrl(null);
    }
  };

  // Fetch subject details
  const { data: subject, isLoading: isLoadingSubject } = useQuery<
    Subject & {
      education_levels?: Array<{
        id: number;
        name: string;
      }>;
      tutor_count?: number;
    }
  >({
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
        is_verified: boolean;
      };
      subject: {
        name: string;
      };
      level: {
        name: string;
      };
      teachingMode: string;
      hourlyRate: number;
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
      <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10 max-w-[95%] md:max-w-[90%] lg:max-w-7xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-2/3">
            <Skeleton className="h-8 w-full sm:w-3/4 mb-3" />
            <Skeleton className="h-6 w-full sm:w-1/2 mb-3" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="w-full sm:w-1/3">
            <Skeleton className="h-10 w-full sm:w-48 ml-auto" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full col-span-2 sm:col-span-1" />
        </div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10 max-w-[95%] md:max-w-[90%] lg:max-w-7xl">
      {/* Login Dialog */}
      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Breadcrumb */}
      <Breadcrumb className="mb-6 text-sm overflow-hidden">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/subjects">Môn học</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink className="truncate max-w-[120px] xs:max-w-[150px] sm:max-w-xs">
            {subject?.name}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Courses Section with Subject Info */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 mb-6 pb-6 border-b border-border/30">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            {subject?.name}
          </h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {subject?.education_levels?.map((level) => (
              <Badge
                key={level.id}
                className="bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 text-sm"
              >
                {level.name}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            {subject?.description}
          </p>
        </div>

        {isTutor && (
          <Button
            onClick={() =>
              (window.location.href = `/tutor-dashboard/courses?subject_id=${id}`)
            }
            className="bg-primary hover:bg-primary-dark whitespace-nowrap self-start sm:self-center mt-2 sm:mt-0"
            size="sm"
            aria-label="Tạo khóa học mới"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo khóa học mới
          </Button>
        )}
      </div>

      {/* Subject Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <div className="flex items-center bg-muted/40 p-3 rounded-lg hover:bg-muted/60 transition-colors">
          <Users className="mr-3 h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="text-sm font-medium">
              {subject?.tutor_count || 0} gia sư
            </div>
          </div>
        </div>
        <div className="flex items-center bg-muted/40 p-3 rounded-lg hover:bg-muted/60 transition-colors">
          <GraduationCap className="mr-3 h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="text-sm font-medium">
              {subject?.education_levels?.length || 0} cấp học
            </div>
          </div>
        </div>
        <div className="flex items-center bg-muted/40 p-3 rounded-lg hover:bg-muted/60 transition-colors col-span-1 sm:col-span-2 md:col-span-1">
          <Clock className="mr-3 h-5 w-5 text-primary shrink-0" />
          <div>
            <div className="text-sm font-medium whitespace-nowrap">
              {formatPrice(subject?.hourly_rate || 0)}/giờ (TB)
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-6">
        Khóa học {subject?.name}
      </h2>

      {!courses?.courses?.length ? (
        <div className="text-center py-8 sm:py-12 bg-muted/30 rounded-xl shadow-sm border border-border/50">
          <div className="bg-primary/5 w-16 sm:w-20 h-16 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Book className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-70" />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium mb-3">
            Chưa có khóa học nào
          </h3>
          <p className="text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto px-4">
            Hiện chưa có gia sư nào đăng tải khóa học cho môn học này
          </p>

          {isTutor && (
            <Button
              onClick={() =>
                (window.location.href = `/tutor-dashboard/courses?subject_id=${id}`)
              }
              className="bg-primary hover:bg-primary-dark px-4 sm:px-6 py-3 sm:py-6 h-auto text-sm sm:text-base font-medium"
              size="lg"
            >
              <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Tạo khóa học mới cho môn này
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {courses.courses.map((course) => (
            <Card
              key={course.id}
              className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-border/60 w-full"
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-border/50">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-primary/20 shrink-0">
                    {course.tutor.user.avatar ? (
                      <img
                        src={course.tutor.user.avatar}
                        alt={`${course.tutor.user.first_name} ${course.tutor.user.last_name}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Users className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold line-clamp-2">
                      {course.title}
                    </h3>
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <span className="truncate">
                        {course.tutor.user.first_name}{" "}
                        {course.tutor.user.last_name}
                      </span>
                      {course.tutor.is_verified && (
                        <CheckCircle
                          className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1 text-primary"
                          fill="currentColor"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 sm:mb-5 line-clamp-2 sm:line-clamp-3">
                  {course.description}
                </p>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
                  {course.subject && (
                    <Badge className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30 text-xs sm:text-sm">
                      {course.subject.name}
                    </Badge>
                  )}

                  {course.level && (
                    <Badge className="bg-secondary-light/20 text-secondary-dark hover:bg-secondary-light/30 text-xs sm:text-sm">
                      {course.level.name}
                    </Badge>
                  )}

                  <Badge className="bg-muted/50 text-foreground hover:bg-muted text-xs sm:text-sm">
                    {course.teachingMode === "online"
                      ? "Online"
                      : course.teachingMode === "offline"
                      ? "Tại nhà"
                      : "Online & Tại nhà"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="font-medium text-base sm:text-lg text-secondary">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(Number(course.hourly_rate))}
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                      /giờ
                    </span>
                  </div>

                  <Button
                    onClick={() =>
                      handleBooking(course.tutor.id, course.id, course.title)
                    }
                    className="bg-primary hover:bg-primary-dark text-sm"
                    size="sm"
                    aria-label={`Đặt lịch khóa học ${course.title}`}
                  >
                    Đặt lịch
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
