import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import TutorCard from "@/components/ui/TutorCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TutorProfile() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  // Get tutor details
  const { data: tutor, isLoading: tutorLoading } = useQuery<TutorProfile>({
    queryKey: [`/api/v1/tutors/${id}`],
  });

  // Get tutor's courses
  interface TutorCourse {
    id: string | number;
    title: string;
    description?: string;
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

  const { data: coursesResponse, isLoading: coursesLoading } =
    useQuery<CoursesResponse>({
      queryKey: [`/api/v1/tutors/${id}/courses`],
      enabled: !!id,
    });

  // Extract courses from response
  const tutorCourses = coursesResponse?.courses || [];

  // Define type for reviews data
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

  // Get tutor's reviews
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

  // Define type for tutor data
  interface TutorProfile {
    id: string;
    user?: {
      name?: string;
      first_name?: string;
      last_name?: string;
      avatar?: string;
    };
    bio?: string;
    rating: number;
    total_reviews?: number;
    is_verified: boolean;
  }

  // Define type for favorite check response
  interface FavoriteCheckResponse {
    isFavorite: boolean;
  }

  // Check if tutor is in favorites
  const { data: checkFavoriteData, isLoading: checkFavoriteLoading } =
    useQuery<FavoriteCheckResponse>({
      queryKey: [`/api/v1/students/favorite-tutors/check/${id}`],
      enabled: !!user && user.role === "student",
    });

  // Update favorite status when data changes
  useEffect(() => {
    if (checkFavoriteData) {
      setIsFavorite(checkFavoriteData.isFavorite || false);
    }
  }, [checkFavoriteData]);

  // Helper function to format currency
  const formatPrice = (price: number | string) => {
    // Đảm bảo giá trị price được chuyển đổi thành số
    const numericPrice = typeof price === "string" ? parseFloat(price) : price;

    // Kiểm tra nếu giá trị không phải là số hợp lệ
    if (isNaN(numericPrice)) {
      return "Liên hệ";
    }

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(numericPrice);
  };

  // Helper function to safely get the minimum hourly rate from courses
  const getMinHourlyRate = (
    courses: TutorCourse[] | undefined
  ): number | null => {
    if (!courses || !Array.isArray(courses) || courses.length === 0)
      return null;

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

  // Add tutor to favorites
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/v1/students/favorite-tutors/${id}`);
    },
    onSuccess: () => {
      setIsFavorite(true);
      toast({
        title: "Đã thêm vào danh sách yêu thích",
        description: "Gia sư đã được thêm vào danh sách yêu thích của bạn.",
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/students/favorite-tutors/check/${id}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/students/favorite-tutors"],
      });
    },
    onError: (error) => {
      console.error("Error adding to favorites:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm gia sư vào danh sách yêu thích.",
        variant: "destructive",
      });
    },
  });

  // Remove tutor from favorites
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        "DELETE",
        `/api/v1/students/favorite-tutors/${id}`
      );
    },
    onSuccess: () => {
      setIsFavorite(false);
      toast({
        title: "Đã xóa khỏi danh sách yêu thích",
        description: "Gia sư đã được xóa khỏi danh sách yêu thích của bạn.",
        variant: "default",
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/students/favorite-tutors/check/${id}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/students/favorite-tutors"],
      });
    },
    onError: (error) => {
      console.error("Error removing from favorites:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa gia sư khỏi danh sách yêu thích.",
        variant: "destructive",
      });
    },
  });

  // Handle favorite toggle
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

  const isLoading = tutorLoading || coursesLoading || reviewsLoading;

  // Redirect if tutor not found
  useEffect(() => {
    if (!tutorLoading && !tutor) {
      navigate("/tutors");
    }
  }, [tutor, tutorLoading, navigate]);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading tutor profile...</span>
        </div>
      </div>
    );
  }

  if (!tutor) return null;

  // Start a conversation with the tutor
  const startConversation = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      // Create or retrieve conversation
      const response = await fetch(`/api/v1/conversations/tutor/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/dashboard/student/messages/${data.conversationId}`);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tutor Profile Header */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center">
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage
                      src={tutor.user?.avatar ?? undefined}
                      alt={
                        tutor.user?.name ||
                        (tutor.user?.first_name
                          ? `${tutor.user.first_name} ${tutor.user.last_name}`
                          : "Tutor")
                      }
                    />
                    <AvatarFallback className="text-2xl">
                      {tutor.user?.name
                        ? tutor.user.name[0]
                        : tutor.user?.first_name
                        ? `${tutor.user.first_name[0]}${
                            tutor.user.last_name?.[0] || ""
                          }`
                        : "T"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="ml-0 md:ml-6 mt-4 md:mt-0 flex-1">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                      <h1 className="text-2xl md:text-3xl font-medium">
                        {tutor.user?.name ||
                          (tutor.user?.first_name
                            ? `${tutor.user.first_name} ${tutor.user.last_name}`
                            : "Tutor")}
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
                          ({tutor.total_reviews || 0} reviews)
                        </span>
                      </div>
                    </div>

                    {/* Hiển thị các teaching modes từ courses */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tutorCourses && tutorCourses.length > 0 ? (
                        Array.from(
                          new Set(
                            tutorCourses.map(
                              (course) => course?.teaching_mode || "online"
                            )
                          )
                        ).map((mode, index) => (
                          <Badge
                            key={`header-mode-${index}-${mode}`}
                            className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                          >
                            {mode === "online"
                              ? "Online"
                              : mode === "offline"
                              ? "Tại nhà"
                              : "Online & Tại nhà"}
                          </Badge>
                        ))
                      ) : (
                        <Badge className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30">
                          Chưa có thông tin
                        </Badge>
                      )}
                    </div>

                    {/* Hiển thị giá tối thiểu từ courses */}
                    {tutorCourses && tutorCourses.length > 0 && (
                      <div className="mt-2 text-xl font-semibold">
                        Học phí từ{" "}
                        {formatPrice(getMinHourlyRate(tutorCourses) || 0)}
                        <span className="text-sm text-muted-foreground">
                          /giờ
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {tutor.is_verified && (
                    <div className="flex items-center text-success">
                      <Award className="h-4 w-4 mr-1" />
                      <span>Verified</span>
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
                  Khóa học ({coursesResponse?.count || 0})
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  Đánh giá ({tutor.total_reviews || 0})
                </TabsTrigger>
              </TabsList>

              {/* About Tab */}
              <TabsContent value="about" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-medium mb-4">About Me</h2>
                    <p className="whitespace-pre-line">{tutor.bio}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Courses Tab */}
              <TabsContent value="courses" className="pt-4">
                <Card>
                  <CardContent className="p-6">
                    {!coursesLoading &&
                    tutorCourses &&
                    tutorCourses.length > 0 ? (
                      <div className="grid gap-6">
                        {tutorCourses.map((course) => (
                          <div
                            key={course.id}
                            className="border rounded-lg p-4 hover:border-primary transition-colors"
                          >
                            <h3 className="text-lg font-medium mb-2">
                              {course.title || "Untitled Course"}
                            </h3>
                            <p className="text-muted-foreground mb-4 whitespace-pre-line">
                              {course.description || "No description available"}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                              {course.subject && (
                                <Badge
                                  key={`subject-${course.id}`}
                                  className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                                >
                                  {course.subject.name}
                                </Badge>
                              )}

                              {course.level && (
                                <Badge
                                  key={`level-${course.id}`}
                                  className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
                                >
                                  {course.level.name}
                                </Badge>
                              )}

                              <Badge
                                key={`mode-${course.id}`}
                                className="bg-secondary-light/20 text-secondary-dark hover:bg-secondary-light/30"
                              >
                                {course.teaching_mode === "online"
                                  ? "Online"
                                  : course.teaching_mode === "offline"
                                  ? "Tại nhà"
                                  : "Online & Tại nhà"}
                              </Badge>
                            </div>

                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium text-secondary">
                                  {formatPrice(course.hourly_rate || 0)}
                                  <span className="text-sm text-muted-foreground">
                                    /giờ
                                  </span>
                                </span>
                                {course.student_count !== undefined &&
                                  course.student_count > 0 && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      <Users className="h-3 w-3 inline mr-1" />
                                      {course.student_count} học viên
                                    </div>
                                  )}
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

                              <Button
                                onClick={() =>
                                  navigate(`/book/${id}?course=${course.id}`)
                                }
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
                        {coursesLoading ? (
                          <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                        ) : (
                          <>
                            <Book className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">
                              Gia sư này chưa công bố khóa học nào.
                            </p>
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
                                  alt={
                                    review.student?.name ||
                                    (review.student?.first_name
                                      ? `${review.student.first_name} ${review.student.last_name}`
                                      : "Student")
                                  }
                                />
                                <AvatarFallback>
                                  {review.student?.name
                                    ? review.student.name[0]
                                    : review.student?.first_name
                                    ? `${review.student.first_name[0]}${
                                        review.student.last_name?.[0] || ""
                                      }`
                                    : "S"}
                                </AvatarFallback>
                              </Avatar>

                              <div className="ml-3">
                                <div className="flex items-center">
                                  <h4 className="font-medium">
                                    {review.student?.name ||
                                      (review.student?.first_name
                                        ? `${review.student.first_name} ${review.student.last_name}`
                                        : "Student")}
                                  </h4>
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {new Date(
                                      review.created_at
                                    ).toLocaleDateString()}
                                  </span>
                                </div>

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
                          This tutor has not received any reviews yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div>
            {/* Contact Card */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-medium mb-4">
                  Contact{" "}
                  {tutor.user?.name ||
                    (tutor.user?.first_name
                      ? `${tutor.user.first_name}`
                      : "Tutor")}
                </h3>

                {/* {user && user.role === "student" && (
                  <Button
                    onClick={() => navigate(`/book/${id}`)}
                    className="w-full mb-3"
                    variant="default"
                  >
                    <Calendar className="mr-2 h-4 w-4" /> Đặt lịch học
                  </Button>
                )} */}

                <Button
                  onClick={startConversation}
                  className="w-full mb-3"
                  variant="secondary"
                >
                  <Mail className="mr-2 h-4 w-4" /> Nhắn tin với gia sư
                </Button>

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
                  Usually responds within 24 hours
                </p>
              </CardContent>
            </Card>

            {/* Similar Tutors */}
            {!similarLoading && similarTutors && similarTutors.length > 0 && (
              <div>
                <h3 className="text-xl font-medium mb-4">Similar Tutors</h3>
                <div className="space-y-4">
                  {similarTutors.slice(0, 3).map((tutor) => (
                    <TutorCard key={tutor.id} tutor={tutor} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
