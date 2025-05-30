import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "@/features/auth/authSlice";
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
import OtpVerificationModal from "@/components/auth/OtpVerificationModal";

const loginSchema = z.object({
  email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await dispatch(loginUser(values) as any);

      console.log("Login result:", result);

      if (result.meta.requestStatus === "fulfilled") {
        // Lấy thông tin người dùng đã đăng nhập
        const user = result.payload;

        // Chuyển hướng dựa trên vai trò
        if (user.role === "tutor") {
          navigate("/");
        } else if (user.role === "student") {
          navigate("/");
        } else if (user.role === "admin") {
          navigate("/admin-dashboard");
        } else {
          navigate("/");
        }
      } else if (result.payload && result.payload.includes("unverified")) {
        // Handle unverified account - show verification modal
        setUnverifiedEmail(values.email);
        setShowVerificationModal(true);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Handle successful verification
  const handleVerificationSuccess = () => {
    // After successful verification, try to log in again
    form.handleSubmit(onSubmit)();
  };

  return (
    <MainLayout>
      {showVerificationModal && unverifiedEmail && (
        <OtpVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          email={unverifiedEmail}
          onSuccess={handleVerificationSuccess}
        />
      )}
      <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <span className="text-primary text-2xl font-medium">
                Homi<span className="text-secondary">Tutor</span>
              </span>
            </div>{" "}
            <CardTitle className="text-2xl text-center">
              Đăng nhập tài khoản
            </CardTitle>
            <CardDescription className="text-center">
              Nhập email và mật khẩu để truy cập tài khoản của bạn
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      {" "}
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="email@example.com"
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
                      {" "}
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

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark"
                  disabled={isLoading}
                >
                  {" "}
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Đăng nhập
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            {" "}
            <div className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="text-center text-sm">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Đăng ký
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
}
