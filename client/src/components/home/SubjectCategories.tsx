import { Link } from "wouter";
import { subjects } from "@shared/schema";
import SubjectCard from "@/components/ui/SubjectCard";

// Define Subject type based on the imported subjects
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

// Extended type that aligns with our FeaturedSubject interface in SubjectCard
interface SubjectCategoriesProps {
  subjects: Array<
    Subject & {
      education_levels?: Array<{
        name: string;
        id: number;
      }>;
    }
  >;
}

export default function SubjectCategories({
  subjects,
}: SubjectCategoriesProps) {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-light mb-2">
            Danh mục <span className="font-medium text-primary">môn học</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Khám phá các môn học đa dạng có sẵn trên HomiTutor
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="block"
            >
              <SubjectCard subject={subject} compact={true} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
