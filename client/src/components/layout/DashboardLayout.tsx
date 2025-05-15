import { ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Home,
  User,
  BookOpen,
  MessageSquare,
  PieChart,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Users,
  Settings,
  Calendar,
  UserCheck,
  BarChart3, // Added BarChart3 icon for statistics reports
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useDispatch } from "react-redux";
import { logout } from "@/features/auth/authSlice";
import { useMobile } from "@/hooks/use-mobile";
import { queryClient } from "@/lib/queryClient";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const [, navigate] = useLocation();
  const dispatch = useDispatch();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    // Clear React Query cache before logout to prevent stale data issues
    queryClient.clear();

    dispatch(logout() as any);
    navigate("/");
  };

  // Get sidebar items based on user role
  const getSidebarItems = () => {
    if (user.role === "tutor") {
      return [
        {
          label: "Dashboard",
          icon: <Home className="h-5 w-5" />,
          href: "/dashboard/tutor",
        },
        {
          label: "Profile",
          icon: <User className="h-5 w-5" />,
          href: "/dashboard/tutor/profile",
        },
        {
          label: "Khóa học",
          icon: <BookOpen className="h-5 w-5" />,
          href: "/dashboard/tutor/courses",
        },
        {
          label: "Messages",
          icon: <MessageSquare className="h-5 w-5" />,
          href: "/dashboard/tutor/messages",
        },
        {
          label: "Statistics",
          icon: <PieChart className="h-5 w-5" />,
          href: "/dashboard/tutor/stats",
        },
        {
          label: "Lịch dạy",
          icon: <Calendar className="h-5 w-5" />,
          href: "/dashboard/tutor/schedule",
        }, // Added "Lịch dạy" menu item
      ];
    } else if (user.role === "student") {
      return [
        {
          label: "Dashboard",
          icon: <Home className="h-5 w-5" />,
          href: "/dashboard/student",
        },
        {
          label: "Profile",
          icon: <User className="h-5 w-5" />,
          href: "/dashboard/student/profile",
        },
        {
          label: "My Tutors",
          icon: <Users className="h-5 w-5" />,
          href: "/dashboard/student/tutors",
        },
        {
          label: "Messages",
          icon: <MessageSquare className="h-5 w-5" />,
          href: "/dashboard/student/messages",
        },
      ];
    } else if (user.role === "admin") {
      return [
        {
          label: "Tổng quan",
          icon: <Home className="h-5 w-5" />,
          href: "/admin-dashboard",
        },
        {
          label: "Duyệt yêu cầu gia sư",
          icon: <UserCheck className="h-5 w-5" />,
          href: "/admin-dashboard/tutor-verification",
        },
        {
          label: "Báo cáo thống kê",
          icon: <BarChart3 className="h-5 w-5" />,
          href: "/admin-dashboard/reports",
        },
        {
          label: "Quản lý người dùng",
          icon: <Users className="h-5 w-5" />,
          href: "/admin-dashboard/users",
        },
        {
          label: "Quản lý gia sư",
          icon: <User className="h-5 w-5" />,
          href: "/admin-dashboard/tutors",
        },
      ];
    }
    return [];
  };

  const sidebarItems = getSidebarItems();
  const [location] = useLocation();

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => (window.location.href = "/")}
        >
          <span className="text-primary text-2xl font-medium">
            Homi<span className="text-secondary">Tutor</span>
          </span>
        </div>
      </div>

      <div className="flex items-center p-6 border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar || undefined} alt={user.first_name} />
          <AvatarFallback>
            {user.first_name?.[0]}
            {user.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="font-medium">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {user.role}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {sidebarItems.map((item) => {
            const isActive = location === item.href;
            return (
              <div
                key={item.href}
                className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors cursor-pointer ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                onClick={() => {
                  if (isMobile) setSidebarOpen(false);
                  window.location.href = item.href;
                }}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t">
        <Button
          variant="outline"
          className="w-full flex items-center justify-center"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 border-r">
        {renderSidebarContent()}
      </aside>

      {/* Mobile navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => (window.location.href = "/")}
        >
          <span className="text-primary text-xl font-medium">
            Homi<span className="text-secondary">Tutor</span>
          </span>
        </div>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="p-0 w-10 h-10 rounded-full"
              onClick={() => setSidebarOpen(true)}
            >
              {sidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            {renderSidebarContent()}
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:ml-64 pt-0 md:pt-0">
        <div className="pt-16 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
