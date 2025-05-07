import { Link } from "wouter";
import { Subject } from "@shared/schema";
import SubjectCard from "@/components/ui/SubjectCard";

interface SubjectCategoriesProps {
  subjects: Subject[];
}

export default function SubjectCategories({ subjects }: SubjectCategoriesProps) {
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
            <div key={subject.id} onClick={() => window.location.href = `/subjects/${subject.id}`} className="cursor-pointer">
              <SubjectCard subject={subject} compact={true} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
