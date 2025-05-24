import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "@/features/auth/authSlice";
import { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import OtpVerificationModal from "@/components/auth/OtpVerificationModal";

const loginSchema = z.object({
  email: z.string().email("Vui lòng nhập email hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginDialog({
  isOpen,
  onClose,
  onLoginSuccess,
}: LoginDialogProps) {
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
        // Login successful - call the callback
        onLoginSuccess();
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
    <>
      {showVerificationModal && unverifiedEmail && (
        <OtpVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          email={unverifiedEmail}
          onSuccess={handleVerificationSuccess}
        />
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <span className="text-primary text-2xl font-medium">
                Homi<span className="text-secondary">Tutor</span>
              </span>
            </div>
            <DialogTitle className="text-2xl text-center">
              Đăng nhập
            </DialogTitle>
            <DialogDescription className="text-center">
              Vui lòng đăng nhập để đặt lịch học
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                      <FormLabel>Mật khẩu</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Nhập mật khẩu"
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
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Đăng nhập
                </Button>
              </form>
            </Form>
          </div>

          <DialogFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm">
              <a
                href="/forgot-password"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.href = "/forgot-password";
                }}
              >
                Quên mật khẩu?
              </a>
            </div>
            <div className="text-center text-sm">
              Chưa có tài khoản?{" "}
              <a
                href="/register"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  window.location.href = "/register";
                }}
              >
                Đăng ký
              </a>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
