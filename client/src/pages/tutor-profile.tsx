import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginDialog from "@/components/auth/LoginDialog";
import {
  Loader2,
  Mail,
  Clock,
  Book,
  Award,
  Star,
  MapPin,
  Users,
  Heart,
  Calendar,
  User,
  Phone,
  BookOpen,
  BadgeCheck,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import TutorCard from "@/components/ui/TutorCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface TutorCourse {
  id: string | number;
  title: string;
  description?: string;
  desc?: string;
  subject?: {
    id: string | number;
    name: string;
    description?: string;
    icon?: string;
  };
  level?: {
    id: string | number;
    name: string;
  };
  course_levels?: Array<{
    id: number;
    level: {
      name: string;
    };
  }>;
  teaching_mode: string;
  hourly_rate: number | string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  student_count?: number;
  average_rating?: number;
  review_count?: number;
}

interface CoursesResponse {
  success?: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  courses: TutorCourse[];
}

interface TutorProfile {
  id: string;
  user?: {
    id?: string | number;
    name?: string;
    first_name?: string;
    last_name?: string;
    last_login?: string;
    avatar?: string;
    email?: string;
    phone?: string;
    address?: string;
    date_of_birth?: string;
    gender?: string;
    is_verified?: boolean;
  };
  bio?: string;
  rating: number;
  total_reviews?: number;
  is_verified: boolean;
  experience?: string;
  teaching_method?: string;
  education?: string;
  certifications?: string[];
  created_at?: string;
  updated_at?: string;
  courses?: TutorCourse[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  student?: {
    name?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
  };
}

interface FavoriteCheckResponse {
  isFavorite: boolean;
}

// Helper functions
const formatPrice = (price: number | string): string => {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numericPrice)) {
    return "Liên hệ";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(numericPrice);
};

const getMinHourlyRate = (courses?: TutorCourse[]): number | null => {
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return null;
  }

  const validRates = courses
    .filter((course) => course && course.hourly_rate !== undefined)
    .map((course) => {
      const rate =
        typeof course.hourly_rate === "string"
          ? parseFloat(course.hourly_rate)
          : course.hourly_rate;
      return isNaN(rate) ? Infinity : rate;
    })
    .filter((rate) => rate !== Infinity);

  return validRates.length > 0 ? Math.min(...validRates) : null;
};

const getDisplayName = (
  user?: TutorProfile["user"],
  defaultName = "Tutor"
): string => {
  if (user?.name) return user.name;
  if (user?.first_name)
    return `${user.first_name} ${user.last_name || ""}`.trim();
  return defaultName;
};

const getAvatarInitials = (user?: TutorProfile["user"]): string => {
  if (user?.name) return user.name[0];
  if (user?.first_name) {
    return `${user.first_name[0]}${user.last_name?.[0] || ""}`;
  }
  return "T";
};

const formatTeachingMode = (mode: string): string => {
  switch (mode) {
    case "online":
      return "Online";
    case "offline":
      return "Tại nhà";
    default:
      return "Online & Tại nhà";
  }
};

// Component
export default function TutorProfile() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [pendingBookingUrl, setPendingBookingUrl] = useState<string | null>(
    null
  );

  // Fetch tutor profile
  const { data: tutor, isLoading: tutorLoading } = useQuery<TutorProfile>({
    queryKey: [`/api/v1/tutors/${id}`],
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch tutor profile: ${response.statusText}`
        );
      }
      return response.json();
    },
  });

  // Fetch courses with URL param id
  const {
    data: coursesResponse,
    isLoading: coursesLoading,
    error: coursesError,
  } = useQuery<CoursesResponse>({
    queryKey: [`/api/v1/tutors/${id}/courses`],
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch tutor courses: ${response.statusText}`
        );
      }
      return response.json();
    },
    enabled: !!id,
    retry: 1,
  });

  // Fetch courses with tutor.id (backup)
  const { data: coursesUsingTutorId, isLoading: coursesUsingTutorIdLoading } =
    useQuery<CoursesResponse>({
      queryKey: [`/api/v1/tutors/${tutor?.id}/courses`],
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch tutor courses: ${response.statusText}`
          );
        }
        return response.json();
      },
      enabled: !!tutor?.id && tutor.id.toString() !== id,
      retry: 2,
      retryDelay: 1000,
    });

  // Get reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: [`/api/v1/tutors/${id}/reviews`],
  });

  // Get similar tutors
  const { data: similarTutors, isLoading: similarLoading } = useQuery<
    TutorProfile[]
  >({
    queryKey: [`/api/v1/tutors/similar/${id}`],
    enabled: !!tutor,
  });

  // Check if tutor is in favorites
  const { data: checkFavoriteData } = useQuery<FavoriteCheckResponse>({
    queryKey: [`/api/v1/students/favorite-tutors/check/${id}`],
    enabled: !!user && user.role === "student",
  });

  // Extract courses from available sources
  const tutorCourses = useMemo(() => {
    // For coursesUsingTutorId
    if (
      coursesUsingTutorId?.courses &&
      coursesUsingTutorId.courses.length > 0
    ) {
      return coursesUsingTutorId.courses;
    }

    // For coursesResponse
    if (coursesResponse?.courses && coursesResponse.courses.length > 0) {
      return coursesResponse.courses;
    }

    // For tutor
    if (tutor?.courses && tutor.courses.length > 0) {
      return tutor.courses;
    }

    // Return empty array as fallback
    return [];
  }, [coursesUsingTutorId, coursesResponse, tutor]);

  // Manual course fetch logic for edge cases
  const [manuallyFetchedCourses, setManuallyFetchedCourses] = useState<
    TutorCourse[]
  >([]);

  const shouldManuallyFetchCourses = useMemo(
    () =>
      tutor &&
      !coursesLoading &&
      !coursesUsingTutorIdLoading &&
      tutorCourses.length === 0,
    [tutor, coursesLoading, coursesUsingTutorIdLoading, tutorCourses.length]
  );

  // Manual fetch effect
  useEffect(() => {
    const shouldFetchManually =
      shouldManuallyFetchCourses && manuallyFetchedCourses.length === 0;

    if (shouldFetchManually && tutor) {
      const fetchFromBothSources = async () => {
        try {
          // Try by user_id
          if (tutor.user?.id) {
            const userIdResponse = await fetch(
              `/api/v1/tutors/${tutor.user.id}/courses`
            );
            if (userIdResponse.ok) {
              const data = await userIdResponse.json();
              if (data?.courses?.length > 0) {
                setManuallyFetchedCourses(data.courses);
                return;
              }
            }
          }

          // Try by profile ID if different from initial ID
          if (tutor.id && tutor.id !== id) {
            const profileIdResponse = await fetch(
              `/api/v1/tutors/${tutor.id}/courses`
            );
            if (profileIdResponse.ok) {
              const data = await profileIdResponse.json();
              if (data?.courses?.length > 0) {
                setManuallyFetchedCourses(data.courses);
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error during manual course fetch:", error);
        }
      };

      fetchFromBothSources();
    }
  }, [tutor, shouldManuallyFetchCourses, manuallyFetchedCourses.length, id]);

  // Combine all course sources
  const allCourses =
    tutorCourses.length > 0 ? tutorCourses : manuallyFetchedCourses;

  // Update favorite status when data changes
  useEffect(() => {
    if (checkFavoriteData) {
      setIsFavorite(checkFavoriteData.isFavorite || false);
    }
  }, [checkFavoriteData]);

  // Redirect if tutor not found
  useEffect(() => {
    if (!tutorLoading && !tutor) {
      navigate("/tutors");
    }
  }, [tutor, tutorLoading, navigate]);

  // Loading status
  const isLoading =
    tutorLoading ||
    coursesLoading ||
    coursesUsingTutorIdLoading ||
    reviewsLoading;

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/v1/students/favorite-tutors/${id}`),
    onSuccess: () => {
      setIsFavorite(true);
      toast({
        title: "Đã thêm vào danh sách yêu thích",
        description: "Gia sư đã được thêm vào danh sách yêu thích của bạn.",
        variant: "default",
      });
      invalidateFavoriteQueries();
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể thêm gia sư vào danh sách yêu thích.",
        variant: "destructive",
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/v1/students/favorite-tutors/${id}`),
    onSuccess: () => {
      setIsFavorite(false);
      toast({
        title: "Đã xóa khỏi danh sách yêu thích",
        description: "Gia sư đã được xóa khỏi danh sách yêu thích của bạn.",
        variant: "default",
      });
      invalidateFavoriteQueries();
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa gia sư khỏi danh sách yêu thích.",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const invalidateFavoriteQueries = () => {
    queryClient.invalidateQueries({
      queryKey: [`/api/v1/students/favorite-tutors/check/${id}`],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/v1/students/favorite-tutors"],
    });
  };

  const handleBooking = (
    tutorId: string | number | undefined,
    courseId?: string | number
  ) => {
    if (!tutorId) return;

    const bookingUrl = courseId
      ? `/book/${tutorId}?course=${courseId}`
      : `/book/${tutorId}`;

    if (!user) {
      setPendingBookingUrl(bookingUrl);
      setIsLoginDialogOpen(true);
    } else {
      navigate(bookingUrl);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginDialogOpen(false);
    if (pendingBookingUrl) {
      navigate(pendingBookingUrl);
      setPendingBookingUrl(null);
    }
  };

  const toggleFavorite = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };

  const startConversation = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (isStartingConversation || !id) {
      return;
    }

    try {
      setIsStartingConversation(true);

      toast({
        title: "Đang kết nối...",
        description: "Đang thiết lập cuộc trò chuyện với gia sư",
        variant: "default",
      });

      const response = await apiRequest(
        "POST",
        `/api/v1/conversations/tutor/${id}`
      );

      if (response.ok) {
        const data = await response.json();
        const conversationId = data.conversation?.id;

        if (!conversationId) {
          throw new Error("No conversation ID returned from the server");
        }

        queryClient.invalidateQueries({
          queryKey: [`/api/v1/conversations`],
        });

        toast({
          title: "Kết nối thành công",
          description: "Cuộc trò chuyện đã được thiết lập với gia sư",
          variant: "default",
        });

        navigate(`/dashboard/messages/${conversationId}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to start conversation");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi không xác định";

      toast({
        title: "Lỗi kết nối",
        description: `Không thể bắt đầu cuộc trò chuyện với gia sư. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsStartingConversation(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-xl">Đang tải thông tin gia sư...</span>
      </div>
    );
  }

  // No tutor found
  if (!tutor) return null;

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content - 2/3 columns */}
          <div className="lg:col-span-2">
            {/* Tutor Profile Header */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center">
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage
                      src={tutor.user?.avatar ?? undefined}
                      alt={getDisplayName(tutor.user)}
                    />
                    <AvatarFallback className="text-2xl">
                      {getAvatarInitials(tutor.user)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="ml-0 md:ml-6 mt-4 md:mt-0 flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                      <h1 className="text-2xl md:text-3xl font-medium">
                        {getDisplayName(tutor.user)}
                      </h1>

                      <div className="flex items-center mt-2 md:mt-0">
                        <Star
                          className="h-5 w-5 text-warning"
                          fill="currentColor"
                        />
                        <span className="ml-1 text-lg font-medium">
                          {tutor.rating}
                        </span>
                        <span className="text-gray-500 ml-1">
                          ({tutor.total_reviews || 0} đánh giá)
                        </span>
                      </div>
                    </div>

                    {/* Teaching modes badges */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allCourses && allCourses.length > 0 ? (
                        Array.from(
                          new Set(
                            allCourses.map(
                              (course) => course?.teaching_mode || "online"
                            )
                          )
                        ).map((mode, index) => (
                          <Badge
                            key={`header-mode-${index}-${mode}`}
                            className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                          >
                            {formatTeachingMode(mode)}
                          </Badge>
                        ))
                      ) : (
                        <Badge className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30">
                          Chưa có thông tin
                        </Badge>
                      )}
                    </div>

                    {/* Hourly rate */}
                    {allCourses && allCourses.length > 0 && (
                      <div className="mt-2 text-xl font-semibold">
                        Học phí từ{" "}
                        {formatPrice(getMinHourlyRate(allCourses) || 0)}
                        <span className="text-sm text-muted-foreground">
                          /giờ
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification badge */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {tutor.is_verified && (
                    <div className="flex items-center text-success">
                      <Award className="h-4 w-4 mr-1" />
                      <span>Đã xác thực</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="about" className="mb-8">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="about">Thông tin</TabsTrigger>
                <TabsTrigger value="courses">
                  Khóa học ({allCourses?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  Đánh giá ({tutor.total_reviews || 0})
                </TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    {/* Bio */}
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <User className="h-5 w-5 text-primary mr-2" />
                        <h2 className="text-xl font-medium">
                          Giới thiệu bản thân
                        </h2>
                      </div>
                      {tutor.bio ? (
                        <p className="whitespace-pre-line text-muted-foreground">
                          {tutor.bio}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic">
                          Gia sư chưa cập nhật thông tin giới thiệu.
                        </p>
                      )}
                    </div>

                    <Separator className="my-6" />

                    {/* Personal info and stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Personal info column */}
                      <div>
                        <div className="flex items-center mb-4">
                          <Users className="h-5 w-5 text-primary mr-2" />
                          <h2 className="text-xl font-medium">
                            Thông tin cá nhân
                          </h2>
                        </div>

                        <div className="space-y-4">
                          {/* Name */}
                          <div className="flex items-start">
                            <User className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                            <div>
                              <p className="font-medium text-sm">Họ tên</p>
                              <p className="text-muted-foreground">
                                {tutor.user?.first_name && tutor.user?.last_name
                                  ? `${tutor.user.first_name} ${tutor.user.last_name}`
                                  : "Chưa cập nhật"}
                              </p>
                            </div>
                          </div>

                          {/* Address */}
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                            <div>
                              <p className="font-medium text-sm">Địa chỉ</p>
                              <p className="text-muted-foreground">
                                {tutor.user?.address || "Chưa cập nhật"}
                              </p>
                            </div>
                          </div>

                          {/* Phone - only if available */}
                          {tutor.user?.phone && (
                            <div className="flex items-start">
                              <Phone className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">
                                  Số điện thoại
                                </p>
                                <p className="text-muted-foreground">
                                  {tutor.user.phone}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Date of birth */}
                          {tutor.user?.date_of_birth && (
                            <div className="flex items-start">
                              <Calendar className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">Ngày sinh</p>
                                <p className="text-muted-foreground">
                                  {new Date(
                                    tutor.user.date_of_birth
                                  ).toLocaleDateString("vi-VN")}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Gender */}
                          {tutor.user?.gender && (
                            <div className="flex items-start">
                              <User className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">Giới tính</p>
                                <p className="text-muted-foreground">
                                  {tutor.user.gender === "male"
                                    ? "Nam"
                                    : tutor.user.gender === "female"
                                    ? "Nữ"
                                    : tutor.user.gender}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Joined date */}
                          {tutor.created_at && (
                            <div className="flex items-start">
                              <Clock className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">
                                  Tham gia từ
                                </p>
                                <p className="text-muted-foreground">
                                  {new Date(
                                    tutor.created_at
                                  ).toLocaleDateString("vi-VN")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Professional info column */}
                      <div>
                        <div className="flex items-center mb-4">
                          <GraduationCap className="h-5 w-5 text-primary mr-2" />
                          <h2 className="text-xl font-medium">
                            Thông tin chuyên môn
                          </h2>
                        </div>

                        <div className="space-y-4">
                          {/* Rating */}
                          <div className="flex items-start">
                            <Star
                              className="h-4 w-4 text-warning mt-1 mr-3"
                              fill="currentColor"
                            />
                            <div>
                              <p className="font-medium text-sm">Đánh giá</p>
                              <div className="flex items-center">
                                <span className="text-muted-foreground">
                                  {tutor.rating} / 5
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({tutor.total_reviews || 0} đánh giá)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Teaching method */}
                          {tutor.teaching_method && (
                            <div className="flex items-start">
                              <BookOpen className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">
                                  Phương pháp giảng dạy
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line">
                                  {tutor.teaching_method}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Experience */}
                          {tutor.experience && (
                            <div className="flex items-start">
                              <BadgeCheck className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">
                                  Kinh nghiệm
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line">
                                  {tutor.experience}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          {tutor.education && (
                            <div className="flex items-start">
                              <GraduationCap className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                              <div>
                                <p className="font-medium text-sm">
                                  Trình độ học vấn
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line">
                                  {tutor.education}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Verification status */}
                          <div className="flex items-start">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                            <div>
                              <p className="font-medium text-sm">
                                Trạng thái xác minh
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {tutor.is_verified && (
                                  <Badge className="bg-success/20 text-success hover:bg-success/30">
                                    Gia sư đã xác minh
                                  </Badge>
                                )}
                                {tutor.user?.is_verified && (
                                  <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                                    Tài khoản đã xác minh
                                  </Badge>
                                )}
                                {!tutor.is_verified &&
                                  !tutor.user?.is_verified && (
                                    <Badge className="bg-muted/50 text-muted-foreground">
                                      Chưa xác minh
                                    </Badge>
                                  )}
                              </div>
                            </div>
                          </div>

                          {/* Certifications */}
                          {tutor.certifications &&
                            tutor.certifications.length > 0 && (
                              <div className="flex items-start">
                                <Award className="h-4 w-4 text-muted-foreground mt-1 mr-3" />
                                <div>
                                  <p className="font-medium text-sm">
                                    Chứng chỉ
                                  </p>
                                  <ul className="list-disc list-inside text-muted-foreground pl-1 mt-1">
                                    {tutor.certifications.map((cert, index) => (
                                      <li key={index}>{cert}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Courses Tab */}
              <TabsContent value="courses" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    {coursesError ? (
                      <div className="text-center py-8">
                        <div className="text-destructive mb-4">
                          <p>Không thể tải khóa học của gia sư.</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {coursesError instanceof Error
                              ? coursesError.message
                              : "Đã xảy ra lỗi khi tải dữ liệu"}
                          </p>
                        </div>
                        <Button
                          onClick={() => window.location.reload()}
                          variant="outline"
                        >
                          Tải lại trang
                        </Button>
                      </div>
                    ) : !coursesLoading && allCourses.length > 0 ? (
                      <div className="grid gap-6">
                        {allCourses.map((course) => (
                          <div
                            key={course.id}
                            className="border rounded-lg p-4 hover:border-primary transition-colors"
                          >
                            <h3 className="text-lg font-medium mb-2">
                              {course.title || "Khóa học chưa đặt tên"}
                            </h3>
                            <p className="text-muted-foreground mb-4 whitespace-pre-line">
                              {course.desc ||
                                course.description ||
                                "Chưa có mô tả"}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {/* Subject badge */}
                              {course.subject && (
                                <Badge
                                  key={`subject-${course.id}`}
                                  className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                                >
                                  {course.subject.name}
                                </Badge>
                              )}

                              {/* Level badge */}
                              {course.level ? (
                                <Badge
                                  key={`level-${course.id}`}
                                  className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                                >
                                  {course.level.name}
                                </Badge>
                              ) : course.course_levels?.length ? (
                                // Alternative level display from course_levels
                                course.course_levels.map((cl) => (
                                  <Badge
                                    key={`level-${cl.id}`}
                                    className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                                  >
                                    {cl.level.name}
                                  </Badge>
                                ))
                              ) : null}

                              {/* Teaching mode badge */}
                              <Badge
                                key={`mode-${course.id}`}
                                className="bg-secondary-light/20 text-secondary-dark hover:bg-secondary-light/30"
                              >
                                {formatTeachingMode(course.teaching_mode)}
                              </Badge>
                            </div>

                            <div className="flex justify-between items-center">
                              <div>
                                {/* Price */}
                                <span className="font-medium text-secondary">
                                  {formatPrice(course.hourly_rate || 0)}
                                  <span className="text-sm text-muted-foreground">
                                    /giờ
                                  </span>
                                </span>

                                {/* Student count if available */}
                                {course.student_count !== undefined &&
                                  course.student_count > 0 && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      <Users className="h-3 w-3 inline mr-1" />
                                      {course.student_count} học viên
                                    </div>
                                  )}

                                {/* Course rating if available */}
                                {course.average_rating !== undefined &&
                                  course.average_rating > 0 && (
                                    <div className="text-sm text-warning mt-1">
                                      <Star
                                        className="h-3 w-3 inline mr-1"
                                        fill="currentColor"
                                      />
                                      {course.average_rating.toFixed(1)} (
                                      {course.review_count} đánh giá)
                                    </div>
                                  )}
                              </div>

                              {/* Book button */}
                              <Button
                                onClick={() => handleBooking(id, course.id)}
                                className="bg-primary hover:bg-primary-dark"
                              >
                                Đặt lịch học
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        {coursesLoading ||
                        coursesUsingTutorIdLoading ||
                        (shouldManuallyFetchCourses &&
                          manuallyFetchedCourses.length === 0) ? (
                          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                        ) : (
                          <>
                            <Book className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">
                              Gia sư này chưa công bố khóa học nào.
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Vui lòng thử lại sau
                            </p>
                            <Button
                              onClick={() => window.location.reload()}
                              variant="outline"
                              className="mt-4"
                            >
                              Tải lại trang
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    {reviews && reviews.length > 0 ? (
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <div
                            key={review.id}
                            className="border-b pb-6 last:border-b-0"
                          >
                            <div className="flex items-start mb-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={review.student?.avatar ?? undefined}
                                  alt={getDisplayName(
                                    review.student,
                                    "Student"
                                  )}
                                />
                                <AvatarFallback>
                                  {getAvatarInitials(review.student) || "S"}
                                </AvatarFallback>
                              </Avatar>

                              <div className="ml-3">
                                <div className="flex items-center">
                                  <h4 className="font-medium">
                                    {getDisplayName(review.student, "Học viên")}
                                  </h4>
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {new Date(
                                      review.created_at
                                    ).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>

                                {/* Star rating display */}
                                <div className="flex text-warning mt-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={`star-${review.id}-${i}`}
                                      className="h-4 w-4"
                                      fill={
                                        i < review.rating
                                          ? "currentColor"
                                          : "none"
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <p className="text-muted-foreground">
                              {review.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">
                          Gia sư này chưa có đánh giá nào.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 1/3 column */}
          <div>
            {/* Contact Card */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium mb-4">
                  Liên hệ với {getDisplayName(tutor.user)}
                </h3>

                {/* Book button - only for students */}
                {user && user.role === "student" && (
                  <Button
                    onClick={() => handleBooking(id)}
                    className="w-full mb-3"
                    variant="default"
                  >
                    <Calendar className="mr-2 h-4 w-4" /> Đặt lịch học
                  </Button>
                )}

                {/* Message button */}
                <Button
                  onClick={startConversation}
                  className="w-full mb-3"
                  variant="secondary"
                  disabled={!user || !id || isStartingConversation}
                >
                  {!user ? (
                    <>
                      <Mail className="mr-2 h-4 w-4" /> Đăng nhập để nhắn tin
                    </>
                  ) : isStartingConversation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang kết
                      nối...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" /> Nhắn tin với gia sư
                    </>
                  )}
                </Button>

                {/* Favorite button - only for students */}
                {user && user.role === "student" && (
                  <Button
                    variant={isFavorite ? "outline" : "secondary"}
                    className={`w-full mb-3 ${
                      isFavorite
                        ? "border-primary text-primary hover:bg-primary/5"
                        : ""
                    }`}
                    onClick={toggleFavorite}
                    disabled={
                      addToFavoritesMutation.isPending ||
                      removeFromFavoritesMutation.isPending
                    }
                  >
                    <Heart
                      className={`mr-2 h-4 w-4 ${
                        isFavorite ? "fill-primary" : ""
                      }`}
                    />
                    {isFavorite
                      ? "Đã thêm vào yêu thích"
                      : "Thêm vào yêu thích"}
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  Thường phản hồi trong vòng 24 giờ
                </p>
              </CardContent>
            </Card>

            {/* Similar Tutors */}
            {!similarLoading && similarTutors && similarTutors.length > 0 && (
              <div>
                <h3 className="text-xl font-medium mb-4">Gia sư tương tự</h3>
                <div className="space-y-4">
                  {similarTutors.slice(0, 3).map((similarTutor) => (
                    <TutorCard
                      key={similarTutor.id}
                      tutor={{
                        ...similarTutor,
                        id:
                          typeof similarTutor.id === "string"
                            ? parseInt(similarTutor.id)
                            : Number(similarTutor.id) || 0,
                        user_id:
                          typeof similarTutor.user?.id === "string"
                            ? parseInt(similarTutor.user.id)
                            : Number(similarTutor.user?.id) || 0,
                        hourly_rate:
                          getMinHourlyRate(similarTutor.courses) || 0,
                        bio: similarTutor.bio || "",
                        name: getDisplayName(similarTutor.user),
                        rating: similarTutor.rating || 0,
                        is_verified: !!similarTutor.is_verified,
                      }}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
