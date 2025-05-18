import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Star, Calendar, Clock, HeartOff } from "lucide-react";
import { tutorProfiles } from "@shared/schema";

interface FeaturedTutorUser {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  avatar: string;
}

interface FeaturedTutorSubject {
  id: number;
  name: string;
  description: string;
  icon: string;
  tutor_count: number;
  created_at: string;
  updated_at: string;
}

interface FeaturedTutor {
  id: number;
  user_id: number;
  bio: string;
  rating: string;
  user: FeaturedTutorUser;
  subjects: FeaturedTutorSubject[];
  is_featured?: boolean;
  education?: string;
  availability?: string;
  courses?: {
    id: number;
    teaching_mode: string;
    hourly_rate: number | string;
  }[];
}

// Định nghĩa lại ExtendedTutorProfile để tương thích với TutorProfile nhưng bao gồm các trường cần thiết
interface ExtendedTutorProfile {
  id: number | string;
  user_id?: number; // Optional để tương thích với TutorProfile
  bio?: string;
  rating: number | string;
  is_verified?: boolean;
  total_reviews?: number;
  is_featured?: boolean;
  education?: string;
  availability?: string;
  subjects?: any[];
  user?: {
    id?: number;
    name?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string | null;
  };
  courses?: {
    id: number;
    teaching_mode: string;
    hourly_rate: number | string;
  }[];
  [key: string]: any; // Để tương thích với các property khác
}

// Interface for favorite tutors from student dashboard
export interface FavoriteDashboardTutor {
  id: number;
  user_id: number;
  bio: string;
  rating?: number | string;
  availability?: string;
  education?: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
  subjects?: any[];
  is_featured?: boolean;
  courses?: {
    id: number;
    teaching_mode: string;
    hourly_rate: number | string;
  }[];
  [key: string]: any;
}

interface TutorCardProps {
  tutor: ExtendedTutorProfile | FeaturedTutor | FavoriteDashboardTutor;
  compact?: boolean;
  isFavorite?: boolean;
  onRemoveFromFavorites?: (tutorId: number) => void;
}

export default function TutorCard({
  tutor,
  compact = false,
  isFavorite = false,
  onRemoveFromFavorites,
}: TutorCardProps) {
  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };

  // Helper function to determine tutor name
  const getTutorName = () => {
    if ("user" in tutor && tutor.user) {
      if ("name" in tutor.user && tutor.user.name) {
        return tutor.user.name;
      } else if (tutor.user.first_name && tutor.user.last_name) {
        return `${tutor.user.first_name} ${tutor.user.last_name}`;
      }
    }
    return "Tutor";
  };

  // Helper function to get tutor avatar
  const getTutorAvatar = () => {
    if ("user" in tutor && tutor.user) {
      return tutor.user.avatar ?? undefined;
    }
    return undefined;
  };

  // Helper function to get avatar fallback
  const getAvatarFallback = () => {
    const name = getTutorName();
    return name ? name[0] : "T";
  };

  // Helper function to safely check if tutor has courses with teaching modes
  const getTeachingModes = () => {
    if (tutor.courses && tutor.courses.length > 0) {
      return Array.from(new Set(tutor.courses.map((c) => c.teaching_mode)));
    }
    return [];
  };

  // Helper function to get minimum hourly rate from courses
  const getMinHourlyRate = () => {
    if (tutor.courses && tutor.courses.length > 0) {
      // Chuyển đổi tất cả hourly_rate thành số để so sánh
      const numericRates = tutor.courses.map((course) => {
        const rate =
          typeof course.hourly_rate === "string"
            ? parseFloat(course.hourly_rate)
            : course.hourly_rate;

        return isNaN(rate as number) ? Infinity : rate;
      });

      // Lọc bỏ các giá trị Infinity và lấy giá trị nhỏ nhất
      const validRates = numericRates.filter((rate) => rate !== Infinity);
      return validRates.length > 0
        ? Math.min(...(validRates as number[]))
        : null;
    }
    return null;
  };

  if (compact) {
    return (
      <Card className="hover-rise h-full overflow-hidden">
        <div className="p-4 flex items-center gap-4 h-full w-full">
          <Avatar className="h-12 w-12">
            <AvatarImage src={getTutorAvatar()} alt={getTutorName()} />
            <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium truncate">{getTutorName()}</h3>
              <div className="flex items-center ml-2 shrink-0">
                <Star className="h-4 w-4 text-warning fill-warning" />
                <span className="ml-1 text-sm">{tutor.rating}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {/* {tutor.education || ""} */}
            </p>
            <div className="flex items-center justify-between mt-1 flex-wrap">
              <p className="text-secondary font-medium text-sm mr-2">
                {getMinHourlyRate()
                  ? formatPrice(getMinHourlyRate() as number)
                  : "Liên hệ"}
                <span className="text-xs text-muted-foreground">/giờ</span>
              </p>
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                {isFavorite && onRemoveFromFavorites && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center text-red-500 border-red-200 hover:bg-red-50 h-6 px-1.5 whitespace-nowrap"
                      >
                        <HeartOff className="h-4 w-4 mr-1" />
                        Xóa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Xóa khỏi danh sách yêu thích?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn xóa gia sư này khỏi danh sách
                          yêu thích không?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            onRemoveFromFavorites(Number(tutor.id))
                          }
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary text-white hover:bg-primary-dark h-6 px-1.5 whitespace-nowrap"
                  onClick={() => {
                    const tutorId = tutor.id;
                    if (tutorId) window.location.href = `/tutors/${tutorId}`;
                  }}
                >
                  Xem
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="hover-rise flex flex-col h-full">
      <div className="relative h-48 rounded-t-lg overflow-hidden">
        <img
          src={
            getTutorAvatar() ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              getTutorName()
            )}&background=random`
          }
          alt={getTutorName()}
          className="w-full h-full object-cover"
        />
        {tutor.is_featured && (
          <div className="absolute top-2 right-2 bg-secondary text-white text-xs px-2 py-1 rounded">
            Gia sư hàng đầu
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-lg">{getTutorName()}</h3>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <span className="text-sm ml-1">{tutor.rating}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {tutor.bio || ""}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tutor.subjects &&
            Array.isArray(tutor.subjects) &&
            tutor.subjects.slice(0, 3).map((subject: any) => (
              <Badge
                key={subject.id}
                className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
              >
                {subject.name}
              </Badge>
            ))}

          {/* Hiển thị các phương thức giảng dạy từ các khóa học */}
          {getTeachingModes().map((mode) => (
            <Badge
              key={mode}
              className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
            >
              {mode === "online"
                ? "Online"
                : mode === "offline"
                ? "Tại nhà"
                : "Online & Tại nhà"}
            </Badge>
          ))}
        </div>

        {tutor.availability && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
              Lịch trống:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-xs text-muted-foreground p-2 bg-secondary/10 rounded">
                Có lịch trống. Xem chi tiết để biết thêm.
              </div>
            </div>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between">
          <div>
            {/* Hiển thị giá thấp nhất từ các khóa học (nếu có) */}
            {getMinHourlyRate() ? (
              <span className="text-secondary font-medium">
                {`Từ ${formatPrice(getMinHourlyRate() as number)}`}
                <span className="text-xs text-muted-foreground">/giờ</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Liên hệ để biết giá</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isFavorite && onRemoveFromFavorites && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center text-red-500 border-red-200 hover:bg-red-50 whitespace-nowrap"
                  >
                    <HeartOff className="h-4 w-4 mr-1" />
                    Xóa khỏi yêu thích
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Xóa khỏi danh sách yêu thích?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn xóa gia sư này khỏi danh sách yêu
                      thích không?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onRemoveFromFavorites(Number(tutor.id))}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Xóa
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="default"
              className="bg-primary text-white hover:bg-primary-dark whitespace-nowrap"
              onClick={() => {
                const tutorId = tutor.id;
                if (tutorId) window.location.href = `/tutors/${tutorId}`;
              }}
            >
              Xem chi tiết
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
