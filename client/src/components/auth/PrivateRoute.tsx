import { ComponentType, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { loadUser } from "@/features/auth/authSlice";
import UnauthorizedPage from "@/components/auth/UnauthorizedPage";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  component: ComponentType;
  role?: "student" | "tutor" | "admin";
}

export default function PrivateRoute({
  component: Component,
  role,
}: PrivateRouteProps) {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const [authChecked, setAuthChecked] = useState(false);

  // On mount, check if token exists but user is not loaded (page refresh case)
  useEffect(() => {
    const token = localStorage.getItem("token");

    // If token exists but no user (after page refresh), try to load user
    if (token && !user && !isLoading && !authChecked) {
      console.log("Token exists but no user, loading user data");
      dispatch(loadUser() as any)
        .unwrap()
        .then((userData: any) => {
          console.log("User loaded successfully:", userData);
          setAuthChecked(true);
        })
        .catch((err: unknown) => {
          console.error("Failed to load user:", err);
          // Nếu không thể tải user, xóa token và chuyển hướng đến trang đăng nhập
          localStorage.removeItem("token");
          navigate("/login");
        });
    } else {
      setAuthChecked(true);
    }
  }, [user, isLoading, dispatch, authChecked, navigate]);

  // Show loading spinner during authentication check
  if (isLoading || (localStorage.getItem("token") && !user && !authChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-xl">Đang tải dữ liệu người dùng...</span>
      </div>
    );
  }

  // If user is not logged in and we've already checked auth, redirect to login
  if (!user && authChecked) {
    navigate("/login");
    return null;
  }

  // If role is specified, check if user has the required role
  if (user && role && user.role !== role) {
    return <UnauthorizedPage />;
  }

  // If user is logged in and has the required role (or no specific role is required), render the component
  return <Component />;
}
