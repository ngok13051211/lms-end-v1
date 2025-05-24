// import { Testimonial } from "@shared/schema";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Card, CardContent } from "@/components/ui/card";
// import { Star } from "lucide-react";

// interface TestimonialCardProps {
//   testimonial: Testimonial;
// }

// export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
//   return (
//     <Card>
//       <CardContent className="p-6">
//         <div className="flex items-center mb-4">
//           <Avatar className="h-12 w-12 mr-4">
//             <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
//             <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
//           </Avatar>
//           <div>
//             <h3 className="font-medium">{testimonial.name}</h3>
//             <p className="text-muted-foreground text-sm">{testimonial.role}</p>
//           </div>
//         </div>
//         <div className="mb-4">
//           <div className="flex text-warning">
//             {[...Array(5)].map((_, i) => (
//               <Star
//                 key={i}
//                 className="h-4 w-4"
//                 fill={i < testimonial.rating ? "currentColor" : "none"}
//               />
//             ))}
//           </div>
//         </div>
//         <p className="text-muted-foreground">"{testimonial.comment}"</p>
//       </CardContent>
//     </Card>
//   );
// }
