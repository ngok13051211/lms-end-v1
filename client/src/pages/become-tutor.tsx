import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from "lucide-react";

// Form schema cho thông tin gia sư
const tutorProfileSchema = z.object({
  bio: z.string().min(50, "Giới thiệu cần ít nhất 50 ký tự"),
  education: z.string().min(20, "Thông tin học vấn cần ít nhất 20 ký tự"),
  experience: z.string().min(20, "Kinh nghiệm giảng dạy cần ít nhất 20 ký tự"),
  experience_years: z.coerce.number().min(0, "Số năm kinh nghiệm không hợp lệ"),
  hourly_rate: z.coerce
    .number()
    .min(10000, "Học phí tối thiểu là 10.000 VND/giờ"),
  teaching_mode: z.enum(["online", "offline", "both"]),
  certifications: z.string().optional(),
  availability: z.string().min(5, "Vui lòng cung cấp thời gian bạn có thể dạy"),
});

export default function BecomeTutor() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [location, navigate] = useLocation();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/become-tutor");
    }
  }, [user, navigate]);

  // Redirect to tutor dashboard if already a tutor
  useEffect(() => {
    if (user?.role === "tutor") {
      navigate("/tutor-dashboard");
    }
  }, [user, navigate]);

  // Get subjects and education levels for selection
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<any[]>({
    queryKey: [`/api/v1/subjects`],
  });

  const { data: educationLevels = [], isLoading: levelsLoading } = useQuery<
    any[]
  >({
    queryKey: [`/api/v1/education-levels`],
  });

  // Form initialization
  const form = useForm<z.infer<typeof tutorProfileSchema>>({
    resolver: zodResolver(tutorProfileSchema),
    defaultValues: {
      bio: "",
      education: "",
      experience: "",
      experience_years: 0,
      hourly_rate: 150000, // Default rate
      teaching_mode: "online",
      certifications: "",
      availability: "Tối T2-T6, cả ngày T7-CN",
    },
  });

  // Create tutor profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tutorProfileSchema>) => {
      const response = await apiRequest("POST", "/api/v1/tutors/profile", {
        ...data,
        subject_ids: selectedSubjects,
        level_ids: selectedLevels,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/auth/me`] });
      setStep(3); // Move to success step
    },
  });

  const onSubmit = (data: z.infer<typeof tutorProfileSchema>) => {
    if (step === 1) {
      setStep(2); // Move to subject and level selection
    } else if (step === 2) {
      // Validation for subjects and levels
      if (selectedSubjects.length === 0) {
        return alert("Vui lòng chọn ít nhất một môn học");
      }

      if (selectedLevels.length === 0) {
        return alert("Vui lòng chọn ít nhất một cấp độ giảng dạy");
      }

      createProfileMutation.mutate(data);
    }
  };

  // Handle checkbox selection
  const handleSubjectChange = (id: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleLevelChange = (id: string) => {
    setSelectedLevels((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <MainLayout>
      <div className="py-12 max-w-4xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-medium mb-2">Đăng ký làm gia sư</h1>
          <p className="text-muted-foreground">
            Chia sẻ kiến thức và kết nối với học sinh trên khắp Việt Nam
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {step === 1 && "Thông tin hồ sơ gia sư"}
                {step === 2 && "Môn học và trình độ giảng dạy"}
                {step === 3 && "Đăng ký thành công"}
              </CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <span
                  className={`flex items-center justify-center h-6 w-6 rounded-full mr-2 ${
                    step >= 1 ? "bg-primary text-white" : "bg-muted"
                  }`}
                >
                  1
                </span>
                <span className="mr-2">―</span>
                <span
                  className={`flex items-center justify-center h-6 w-6 rounded-full mr-2 ${
                    step >= 2 ? "bg-primary text-white" : "bg-muted"
                  }`}
                >
                  2
                </span>
                <span className="mr-2">―</span>
                <span
                  className={`flex items-center justify-center h-6 w-6 rounded-full ${
                    step >= 3 ? "bg-primary text-white" : "bg-muted"
                  }`}
                >
                  3
                </span>
              </div>
            </div>
            <CardDescription>
              {step === 1 &&
                "Vui lòng cung cấp thông tin chi tiết để tạo hồ sơ gia sư của bạn"}
              {step === 2 && "Chọn các môn học và cấp độ bạn có thể giảng dạy"}
              {step === 3 && "Hồ sơ của bạn đã được gửi và đang chờ xét duyệt"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 3 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-green-50 text-green-500 mb-6">
                  <CheckCircle className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-medium mb-2">
                  Đăng ký thành công!
                </h3>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Hồ sơ gia sư của bạn đã được gửi đi và đang chờ xét duyệt từ
                  đội ngũ quản trị viên. Chúng tôi sẽ thông báo cho bạn ngay khi
                  hồ sơ được phê duyệt.
                </p>
                <Button onClick={() => navigate("/tutor-dashboard")}>
                  Đi đến trang quản lý gia sư
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {step === 1 && (
                    <>
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Giới thiệu bản thân</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Giới thiệu về bản thân, kinh nghiệm và phương pháp giảng dạy của bạn..."
                                {...field}
                                rows={5}
                              />
                            </FormControl>
                            <FormDescription>
                              Viết ít nhất 50 ký tự giới thiệu bản thân
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="education"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Học vấn</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Các bằng cấp và chứng chỉ học thuật của bạn..."
                                  {...field}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="experience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kinh nghiệm giảng dạy</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Mô tả kinh nghiệm giảng dạy, thành tích..."
                                  {...field}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="experience_years"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Số năm kinh nghiệm</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hourly_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Học phí (VND/giờ)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="10000"
                                  step="10000"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Mức học phí tối thiểu là 10.000 VND/giờ
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="teaching_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hình thức dạy học</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="online" id="online" />
                                  <label
                                    htmlFor="online"
                                    className="cursor-pointer"
                                  >
                                    Trực tuyến
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value="offline"
                                    id="offline"
                                  />
                                  <label
                                    htmlFor="offline"
                                    className="cursor-pointer"
                                  >
                                    Trực tiếp
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="both" id="both" />
                                  <label
                                    htmlFor="both"
                                    className="cursor-pointer"
                                  >
                                    Cả hai
                                  </label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="certifications"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chứng chỉ (không bắt buộc)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Liệt kê các chứng chỉ, giải thưởng bạn đã đạt được..."
                                {...field}
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="availability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thời gian có thể dạy</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Ví dụ: Tối T2-T6, cả ngày T7-CN..."
                                {...field}
                                rows={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="mb-6">
                        <h3 className="text-lg font-medium mb-4">
                          Môn học có thể dạy
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {subjectsLoading ? (
                            <div className="col-span-full py-4 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p>Đang tải danh sách môn học...</p>
                            </div>
                          ) : (
                            subjects?.map((subject: any) => (
                              <div
                                key={subject.id}
                                className="flex items-start space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  id={`subject-${subject.id}`}
                                  className="h-4 w-4 mt-1"
                                  checked={selectedSubjects.includes(
                                    subject.id.toString()
                                  )}
                                  onChange={() =>
                                    handleSubjectChange(subject.id.toString())
                                  }
                                />
                                <label
                                  htmlFor={`subject-${subject.id}`}
                                  className="cursor-pointer"
                                >
                                  <div className="font-medium">
                                    {subject.name}
                                  </div>
                                  {subject.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {subject.description}
                                    </div>
                                  )}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                        {selectedSubjects.length === 0 && (
                          <p className="text-destructive text-sm mt-2">
                            Vui lòng chọn ít nhất một môn học
                          </p>
                        )}
                      </div>

                      <Separator className="my-6" />

                      <div>
                        <h3 className="text-lg font-medium mb-4">
                          Cấp độ giảng dạy
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {levelsLoading ? (
                            <div className="col-span-full py-4 text-center">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              <p>Đang tải danh sách cấp độ...</p>
                            </div>
                          ) : (
                            educationLevels?.map((level: any) => (
                              <div
                                key={level.id}
                                className="flex items-start space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  id={`level-${level.id}`}
                                  className="h-4 w-4 mt-1"
                                  checked={selectedLevels.includes(
                                    level.id.toString()
                                  )}
                                  onChange={() =>
                                    handleLevelChange(level.id.toString())
                                  }
                                />
                                <label
                                  htmlFor={`level-${level.id}`}
                                  className="cursor-pointer"
                                >
                                  <div className="font-medium">
                                    {level.name}
                                  </div>
                                  {level.description && (
                                    <div className="text-sm text-muted-foreground">
                                      {level.description}
                                    </div>
                                  )}
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                        {selectedLevels.length === 0 && (
                          <p className="text-destructive text-sm mt-2">
                            Vui lòng chọn ít nhất một cấp độ giảng dạy
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-4">
                    {step === 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                      >
                        Quay lại
                      </Button>
                    )}

                    <Button
                      type="submit"
                      className="ml-auto"
                      disabled={
                        (step === 2 &&
                          (selectedSubjects.length === 0 ||
                            selectedLevels.length === 0)) ||
                        createProfileMutation.isPending
                      }
                    >
                      {createProfileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : step === 1 ? (
                        "Tiếp theo"
                      ) : (
                        "Hoàn tất đăng ký"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Information boxes */}
        {step < 3 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Lợi ích khi trở thành gia sư
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Thu nhập cao với mức học phí do bạn quyết định</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>
                      Lịch dạy linh hoạt phù hợp với thời gian của bạn
                    </span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Công cụ dạy học trực tuyến hiện đại</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                    <span>Kết nối với học sinh tiềm năng trên toàn quốc</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quy trình xét duyệt</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-6 w-6 mr-3 shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Đăng ký hồ sơ</p>
                      <p className="text-sm text-muted-foreground">
                        Cung cấp thông tin chi tiết về bạn và khả năng giảng dạy
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-6 w-6 mr-3 shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Xét duyệt hồ sơ</p>
                      <p className="text-sm text-muted-foreground">
                        Đội ngũ quản trị viên sẽ xem xét thông tin của bạn
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex items-center justify-center rounded-full bg-primary/10 text-primary h-6 w-6 mr-3 shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Kích hoạt tài khoản</p>
                      <p className="text-sm text-muted-foreground">
                        Sau khi được duyệt, bạn có thể bắt đầu nhận học sinh
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
