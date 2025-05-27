import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "@/features/auth/authSlice";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MainLayout from "@/components/layout/MainLayout";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "Họ là bắt buộc"),
    lastName: z.string().min(2, "Tên là bắt buộc"),
    username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
    email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    role: z.enum(["student", "tutor"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const { isLoading, error, registrationEmail } = useSelector(
    (state: RootState) => state.auth
  );
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "student",
    },
  });

  // Check if we have a pending registration that needs verification
  useEffect(() => {
    if (registrationEmail) {
      const encodedEmail = encodeURIComponent(registrationEmail);
      toast({
        title: "Đăng ký thành công",
        description: "Vui lòng xác minh email để kích hoạt tài khoản của bạn.",
      });
      navigate(`/verify-email/${encodedEmail}`);
    }
  }, [registrationEmail, navigate, toast]);

  const onSubmit = async (values: RegisterFormValues) => {
    const userData = {
      firstName: values.firstName,
      lastName: values.lastName,
      username: values.username,
      email: values.email,
      password: values.password,
      role: values.role,
    };

    try {
      const result = await dispatch(registerUser(userData) as any);
      if (result.meta.requestStatus === "fulfilled") {
        // The redirect will happen in the useEffect when registrationEmail is set
        toast({
          title: "Đăng ký thành công",
          description: "Vui lòng kiểm tra email của bạn để lấy mã xác nhận.",
        });
      } else if (result.meta.requestStatus === "rejected") {
        // Xử lý khi đăng ký thất bại do lỗi từ server
        const errorMessage = result.payload;
        if (errorMessage && errorMessage.includes("Email đã được sử dụng")) {
          toast({
            variant: "destructive",
            title: "Đăng ký thất bại",
            description:
              "Email này đã tồn tại trong hệ thống, vui lòng sử dụng email khác hoặc đăng nhập.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Đăng ký thất bại",
            description:
              errorMessage || "Có lỗi xảy ra trong quá trình đăng ký.",
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi đăng ký",
        description: error.message || "Có lỗi xảy ra trong quá trình đăng ký.",
      });
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <span className="text-primary text-2xl font-medium">
                Homi<span className="text-secondary">Tutor</span>
              </span>
            </div>{" "}
            <CardTitle className="text-2xl text-center">
              Tạo tài khoản
            </CardTitle>
            <CardDescription className="text-center">
              Nhập thông tin chi tiết bên dưới để tạo tài khoản của bạn
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ</FormLabel>
                        <FormControl>
                          <Input placeholder="Nguyễn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên</FormLabel>
                        <FormControl>
                          <Input placeholder="Văn A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên đăng nhập</FormLabel>
                      <FormControl>
                        <Input placeholder="nguyenvana" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>{" "}
                      <FormControl>
                        <Input
                          placeholder="nguyen.vana@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Mật khẩu của bạn"
                            type={showPassword ? "text" : "password"}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-2.5 text-gray-500"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Ẩn" : "Hiện"}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xác nhận mật khẩu</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Xác nhận mật khẩu của bạn"
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tôi muốn đăng ký với tư cách:</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="student" id="student" />
                            <Label htmlFor="student">Học sinh</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="tutor" id="tutor" />
                            <Label htmlFor="tutor">Gia sư</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark"
                  disabled={isLoading}
                >
                  {" "}
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Tạo tài khoản
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex justify-center">
            {" "}
            <div className="text-center text-sm">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Đăng nhập
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}
