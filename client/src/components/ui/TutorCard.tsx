import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Star, Calendar, Clock, HeartOff } from "lucide-react";
import { TutorProfile } from "@shared/schema";

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
  hourly_rate: string;
  teaching_mode: string;
  rating: string;
  user: FeaturedTutorUser;
  subjects: FeaturedTutorSubject[];
  is_featured?: boolean;
  education?: string;
  availability?: string;
}

interface ExtendedTutorProfile extends TutorProfile {
  subjects?: any[];
  user?: any;
}

// Interface for favorite tutors from student dashboard
export interface FavoriteDashboardTutor {
  id: number;
  user_id: number;
  bio: string;
  hourly_rate: string | number;
  teaching_mode?: string;
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
  [key: string]: any;
}

interface TutorCardProps {
  tutor: ExtendedTutorProfile | FeaturedTutor | FavoriteDashboardTutor;
  compact?: boolean;
  isFavorite?: boolean;
  onRemoveFromFavorites?: (tutorId: number) => void;
}

export default function TutorCard({ tutor, compact = false, isFavorite = false, onRemoveFromFavorites }: TutorCardProps) {
  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };

  // Helper function to determine tutor name
  const getTutorName = () => {
    if ('user' in tutor && tutor.user) {
      if ('name' in tutor.user) {
        return tutor.user.name;
      } else if (tutor.user.first_name && tutor.user.last_name) {
        return `${tutor.user.first_name} ${tutor.user.last_name}`;
      }
    }
    return "Tutor";
  };

  // Helper function to get tutor avatar
  const getTutorAvatar = () => {
    if ('user' in tutor && tutor.user) {
      return tutor.user.avatar;
    }
    return "";
  };

  // Helper function to get avatar fallback
  const getAvatarFallback = () => {
    const name = getTutorName();
    return name ? name[0] : "T";
  };

  if (compact) {
    return (
      <Card className="hover-rise">
        <div className="p-4 flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={getTutorAvatar()}
              alt={getTutorName()}
            />
            <AvatarFallback>
              {getAvatarFallback()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium truncate">
                {getTutorName()}
              </h3>
              <div className="flex items-center ml-2 shrink-0">
                <Star className="h-4 w-4 text-warning fill-warning" />
                <span className="ml-1 text-sm">{tutor.rating}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {tutor.education || ''}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-secondary font-medium text-sm">
                {formatPrice(tutor.hourly_rate)}
                <span className="text-xs text-muted-foreground">/giờ</span>
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isFavorite && onRemoveFromFavorites && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center text-red-500 border-red-200 hover:bg-red-50 h-7 px-2 whitespace-nowrap"
                      >
                        <HeartOff className="h-4 w-4 mr-1" />
                        Xóa
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa khỏi danh sách yêu thích?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn xóa gia sư này khỏi danh sách yêu thích không?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onRemoveFromFavorites(tutor.id)}
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
                  className="bg-primary text-white hover:bg-primary-dark h-7 px-2 whitespace-nowrap"
                  onClick={() => window.location.href = `/tutors/${tutor.id}`}
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
            `https://ui-avatars.com/api/?name=${encodeURIComponent(getTutorName())}&background=random`
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
          <h3 className="font-medium text-lg">
            {getTutorName()}
          </h3>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <span className="text-sm ml-1">{tutor.rating}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-3">{tutor.bio || tutor.education || ''}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tutor.subjects && Array.isArray(tutor.subjects) && tutor.subjects.slice(0, 3).map((subject: any) => (
            <Badge
              key={subject.id}
              className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
            >
              {subject.name}
            </Badge>
          ))}
          {tutor.teaching_mode && (
            <Badge className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30">
              {tutor.teaching_mode === "online"
                ? "Online"
                : tutor.teaching_mode === "offline"
                  ? "Tại nhà"
                  : "Online/Offline"}
            </Badge>
          )}
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
            <span className="text-secondary font-medium">
              {formatPrice(tutor.hourly_rate)}
            </span>
            <span className="text-muted-foreground text-sm">/giờ</span>
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
                    <AlertDialogTitle>Xóa khỏi danh sách yêu thích?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn xóa gia sư này khỏi danh sách yêu thích không?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onRemoveFromFavorites(tutor.id)}
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
              onClick={() => window.location.href = `/tutors/${tutor.id}`}
            >
              Xem chi tiết
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
