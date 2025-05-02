import { ComponentType } from "react";
import { useLocation } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import UnauthorizedPage from "@/components/auth/UnauthorizedPage";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  component: ComponentType;
  role?: "student" | "tutor" | "admin";
}

export default function PrivateRoute({ component: Component, role }: PrivateRouteProps) {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading...</span>
      </div>
    );
  }

  // If user is not logged in, redirect to login
  if (!user) {
    navigate("/login");
    return null;
  }

  // If role is specified, check if user has the required role
  if (role && user.role !== role) {
    return <UnauthorizedPage />;
  }

  // If user is logged in and has the required role (or no specific role is required), render the component
  return <Component />;
}
