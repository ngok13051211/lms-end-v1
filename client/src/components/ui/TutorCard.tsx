import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Calendar, Clock } from "lucide-react";
import { TutorProfile } from "@shared/schema";

interface FeaturedTutorUser {
  id: number;
  name: string;
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
}

interface TutorCardProps {
  tutor: TutorProfile | FeaturedTutor;
  compact?: boolean;
}

export default function TutorCard({ tutor, compact = false }: TutorCardProps) {
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
      } else if ('first_name' in tutor.user && 'last_name' in tutor.user) {
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
              <Link href={`/tutors/${tutor.id}`}>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary text-white hover:bg-primary-dark h-7 px-2"
                >
                  Xem
                </Button>
              </Link>
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
              {Object.entries(JSON.parse(typeof tutor.availability === 'string' ? tutor.availability : '{}')).slice(0, 4).map(([day, slots]: [string, any]) => (
                <TooltipProvider key={day}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs bg-secondary/10 rounded p-2 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span className="font-medium">{day}</span>
                        <span className="text-muted-foreground ml-1">({slots.length} ca)</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium text-xs">{day}:</p>
                      <div className="text-xs">
                        {slots.map((slot: string, index: number) => (
                          <div key={index}>{slot}</div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
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
          <Link href={`/tutors/${tutor.id}`}>
            <Button
              variant="default"
              className="bg-primary text-white hover:bg-primary-dark"
            >
              Xem chi tiết
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
