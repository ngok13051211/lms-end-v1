import { ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, FileText, MessageSquare, BarChart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface TutorDashboardLayoutProps {
  children: ReactNode;
  activePage: "profile" | "courses" | "messages" | "stats";
}

export default function TutorDashboardLayout({
  children,
  activePage,
}: TutorDashboardLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    {
      title: "Hồ sơ",
      icon: <UserCircle className="mr-2 h-4 w-4" />,
      href: "/dashboard/tutor/profile",
      active: activePage === "profile",
    },
    {
      title: "Khóa học",
      icon: <FileText className="mr-2 h-4 w-4" />,
      href: "/dashboard/tutor/courses",
      active: activePage === "courses",
    },
    {
      title: "Tin nhắn",
      icon: <MessageSquare className="mr-2 h-4 w-4" />,
      href: "/dashboard/tutor/messages",
      active: activePage === "messages",
    },
    {
      title: "Thống kê",
      icon: <BarChart className="mr-2 h-4 w-4" />,
      href: "/dashboard/tutor/stats",
      active: activePage === "stats",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium mb-1">Quản lý Gia sư</h1>
            <p className="text-muted-foreground">
              Quản lý hồ sơ, thông báo và tương tác với học viên
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={item.active ? "default" : "outline"}
                className="justify-start w-full sm:w-auto"
              >
                {item.icon}
                {item.title}
              </Button>
            </Link>
          ))}
        </div>

        <Separator className="mb-6" />

        {children}
      </div>
    </DashboardLayout>
  );
}