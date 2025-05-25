import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { FeaturedTutorData } from "@/types/featuredTutor";

interface FeaturedTutorCardProps {
  tutor: FeaturedTutorData;
}

export default function FeaturedTutorCard({ tutor }: FeaturedTutorCardProps) {
  const getTutorName = () => {
    return `${tutor.first_name} ${tutor.last_name}`;
  };

  const getAvatarFallback = () => {
    return tutor.first_name?.[0] || "T";
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  return (
    <Card className="w-64 flex-shrink-0 hover:shadow-md transition-shadow duration-200">
      <div className="p-3">
        {/* Header with avatar and name */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={
                tutor.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  getTutorName()
                )}&background=random`
              }
              alt={getTutorName()}
            />
            <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{getTutorName()}</h3>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-muted-foreground">
                {formatRating(tutor.rating)} ({tutor.total_reviews} đánh giá)
              </span>
            </div>
          </div>
        </div>
        {/* Subjects */}
        {tutor.subjects && tutor.subjects.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {tutor.subjects.slice(0, 2).map((subject, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs px-2 py-1"
                >
                  {subject}
                </Badge>
              ))}
              {tutor.subjects.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  +{tutor.subjects.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}{" "}
        {/* Bio */}
        {tutor.bio && (
          <p
            className="text-xs text-muted-foreground mb-3 overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {tutor.bio}
          </p>
        )}
        {/* Action button */}
        <Link href={`/tutors/${tutor.id}`}>
          <Button className="w-full h-8 text-xs" variant="default">
            Xem hồ sơ
          </Button>
        </Link>
      </div>
    </Card>
  );
}
