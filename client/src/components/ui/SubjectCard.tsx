import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Book, Users, MoveRight } from "lucide-react";
import { subjects } from "@shared/schema";

// Định nghĩa kiểu Subject từ schema của subjects
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
};

interface FeaturedSubject
  extends Omit<Subject, "hourly_rate" | "teaching_mode"> {
  courses_count?: number;
  hourly_rate?: number | string | null;
  teaching_mode?: string | null;
  education_levels?: Array<{
    name: string;
    id: number;
  }>;
}

interface SubjectCardProps {
  subject: FeaturedSubject;
  compact?: boolean;
}

export default function SubjectCard({
  subject,
  compact = false,
}: SubjectCardProps) {
  const formatPrice = (price: number | string) => {
    if (!price) return "Thỏa thuận";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };

  if (compact) {
    return (
      <Card className="hover-rise h-full overflow-hidden">
        <div className="p-4 flex items-center gap-4 h-full w-full">
          <div className="h-12 w-12 flex items-center justify-center bg-primary-light/20 rounded-full text-primary">
            <Book className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium truncate">{subject.name}</h3>
              <div className="flex items-center ml-2 shrink-0">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="ml-1 text-sm">
                  {subject.tutor_count || 0} gia sư
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {subject.description || "Các khóa học " + subject.name}
            </p>
            <div className="flex items-center justify-between mt-1">
              <Button
                variant="link"
                size="sm"
                className="text-primary p-0 h-6"
                asChild={false}
              >
                Xem các khóa học
                <MoveRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="hover-rise flex flex-col h-full">
      <div className="relative h-36 rounded-t-lg overflow-hidden bg-gradient-to-r from-primary-light to-primary flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center">
            <Book className="h-8 w-8" />
          </div>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-lg">{subject.name}</h3>
          <div className="flex items-center">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm ml-1">
              {subject.tutor_count || 0} gia sư
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mb-3">
          {subject.description ||
            `Các khóa học ${subject.name} do gia sư có chuyên môn giảng dạy`}
        </p>

        {subject.education_levels && subject.education_levels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {subject.education_levels.map((level) => (
              <Badge
                key={level.id}
                className="bg-primary-light/20 text-primary-dark hover:bg-primary-light/30"
              >
                {level.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-secondary font-medium">
              {formatPrice(subject.hourly_rate || 0)}
            </span>
            <span className="text-muted-foreground text-sm">
              /giờ (Trung bình)
            </span>
          </div>
          <Button
            variant="default"
            className="bg-primary text-white hover:bg-primary-dark whitespace-nowrap"
            onClick={() => (window.location.href = `/subjects/${subject.id}`)}
          >
            Xem khóa học
          </Button>
        </div>
      </div>
    </Card>
  );
}
