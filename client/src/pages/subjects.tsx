import { useQuery } from "@tanstack/react-query";
import { subjects, educationLevels } from "@shared/schema";
import { Loader2, Search, ChevronRight, Book } from "lucide-react";
import { useState } from "react";

// Định nghĩa kiểu dữ liệu
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

type EducationLevel = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SubjectCard from "@/components/ui/SubjectCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";

export default function Subjects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  // Fetch all subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery<
    Array<
      Subject & {
        education_levels?: Array<{
          id: number;
          name: string;
        }>;
      }
    >
  >({
    queryKey: ["/api/v1/subjects"],
  });

  // Fetch education levels
  const { data: educationLevels, isLoading: levelsLoading } = useQuery<
    EducationLevel[]
  >({
    queryKey: ["/api/v1/education-levels"],
  });

  const isLoading = subjectsLoading || levelsLoading;

  // Filter subjects based on search and selected level
  const filteredSubjects = subjects?.filter((subject) => {
    const matchesSearch =
      searchTerm === "" ||
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel =
      selectedLevel === null ||
      subject.education_levels?.some((level) => level.id === selectedLevel);

    return matchesSearch && matchesLevel;
  });

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-10 max-w-[95%] md:max-w-[90%] lg:max-w-7xl">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6 text-sm overflow-hidden">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Trang chủ</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Môn học</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Danh sách môn học
        </h1>
        <p className="text-muted-foreground">
          Khám phá tất cả các môn học đa dạng có sẵn trên HomiTutor
        </p>
      </div>{" "}
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex flex-col w-full md:max-w-md">
          <div className="text-sm font-medium mb-2 text-foreground">
            Tìm kiếm:
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên môn học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-primary/20 focus-visible:ring-primary/30"
            />
          </div>
        </div>
        <div className="flex flex-col w-full md:w-auto">
          <div className="text-sm font-medium mb-2 text-foreground">
            Cấp học:
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              className={`cursor-pointer font-medium px-3 py-1.5 text-sm transition-all ${
                selectedLevel === null
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
              }`}
              onClick={() => setSelectedLevel(null)}
            >
              Tất cả
            </Badge>
            {educationLevels?.map((level) => (
              <Badge
                key={level.id}
                className={`cursor-pointer font-medium px-3 py-1.5 text-sm transition-all ${
                  selectedLevel === level.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
                }`}
                onClick={() =>
                  setSelectedLevel(level.id === selectedLevel ? null : level.id)
                }
              >
                {level.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      {/* Subject Grid */}
      {filteredSubjects && filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {filteredSubjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-muted/30 rounded-xl shadow-sm border border-border/50">
          <div className="bg-primary/5 w-16 sm:w-20 h-16 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Book className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-70" />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium mb-3">
            Không tìm thấy môn học
          </h3>
          <p className="text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto px-4">
            {searchTerm
              ? `Không tìm thấy môn học nào phù hợp với "${searchTerm}". Vui lòng thử tìm kiếm khác.`
              : "Không tìm thấy môn học nào phù hợp với bộ lọc. Vui lòng thử lại với bộ lọc khác."}
          </p>
        </div>
      )}
    </div>
  );
}
