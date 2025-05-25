import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FeaturedTutorCard from "@/components/ui/FeaturedTutorCard";
import { FeaturedTutorData } from "@/types/featuredTutor";
import { apiRequest } from "@/lib/queryClient";

interface TutorSuggestionsListProps {
  subjectId?: number;
  className?: string;
}

export default function TutorSuggestionsList({
  subjectId,
  className = "",
}: TutorSuggestionsListProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const {
    data: tutors,
    isLoading,
    error,
    refetch,
  } = useQuery<FeaturedTutorData[]>({
    queryKey: ["featured-tutors", subjectId],
    queryFn: async () => {
      const url = subjectId
        ? `/api/v1/tutors/featured?subject=${subjectId}`
        : "/api/v1/tutors/featured";

      const response = await apiRequest("GET", url);
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const scrollContainer = (direction: "left" | "right") => {
    const container = document.getElementById("tutor-suggestions-scroll");
    if (!container) return;

    const scrollAmount = 280; // Card width + gap
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
  };

  const handleScroll = () => {
    const container = document.getElementById("tutor-suggestions-scroll");
    if (!container) return;

    const currentPosition = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;

    setScrollPosition(currentPosition);
    setCanScrollLeft(currentPosition > 0);
    setCanScrollRight(currentPosition < maxScroll - 10); // 10px tolerance
  };

  useEffect(() => {
    const container = document.getElementById("tutor-suggestions-scroll");
    if (!container) return;

    // Set initial scroll state
    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [tutors]);

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 ${className}`}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Không thể tải danh sách gia sư.
            <Button
              variant="link"
              className="p-0 ml-1 h-auto"
              onClick={() => refetch()}
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (!tutors || tutors.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Không có gia sư nổi bật nào được tìm thấy.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">
          Gia sư nổi bật
          {subjectId && (
            <span className="text-xs text-muted-foreground ml-1">
              cho môn học này
            </span>
          )}
        </h3>

        {/* Scroll controls */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollContainer("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollContainer("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Scrollable tutor list */}
      <div
        id="tutor-suggestions-scroll"
        className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        {tutors.map((tutor) => (
          <FeaturedTutorCard key={tutor.id} tutor={tutor} />
        ))}
      </div>
    </Card>
  );
}
