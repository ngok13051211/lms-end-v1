import { Testimonial } from "@shared/schema";
import TestimonialCard from "@/components/ui/TestimonialCard";

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export default function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-light mb-2">
            Phụ huynh và học sinh <span className="font-medium text-primary">nói gì</span> về chúng tôi
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Trải nghiệm học tập thực tế từ những người đã sử dụng dịch vụ của HomiTutor
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
