import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { logout } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  User,
  LogOut,
  BookOpen,
  MessageSquare,
  PieChart,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { queryClient } from "@/lib/queryClient";

export default function Navbar() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [, navigate] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    // Clear React Query cache before logout to prevent stale data issues
    queryClient.clear();

    dispatch(logout() as any);
    navigate("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "tutor":
        return "/dashboard/tutor";
      case "student":
        return "/dashboard/student";
      case "admin":
        return "/admin-dashboard";
      default:
        return "/";
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 ${
        isScrolled ? "bg-white shadow-md" : "bg-white"
      } transition-shadow duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <span className="text-primary text-2xl font-medium">
              Homi<span className="text-secondary">Tutor</span>
            </span>
          </Link>
        </div>
        {/* Desktop Navigation */}{" "}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="/tutors"
            className="text-foreground hover:text-primary text-sm font-medium"
          >
            Tìm gia sư
          </Link>
          {!user && (
            <Link
              href="/register"
              className="text-foreground hover:text-primary text-sm font-medium"
            >
              Trở thành gia sư
            </Link>
          )}
          <Link
            href="/blog"
            className="text-foreground hover:text-primary text-sm font-medium"
          >
            Blog
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar || undefined}
                      alt={user.first_name}
                    />
                    <AvatarFallback>
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar || undefined}
                      alt={user.first_name}
                    />
                    <AvatarFallback>
                      {user.first_name?.[0]}
                      {user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={getDashboardLink()}
                    className="w-full flex items-center"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`${getDashboardLink()}/profile`}
                    className="w-full flex items-center"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/messages"
                    className="w-full flex items-center"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Tin nhắn</span>
                  </Link>
                </DropdownMenuItem>
                {user.role === "tutor" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/tutor/courses"
                        className="w-full flex items-center"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Khóa học</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/messages"
                        className="w-full flex items-center"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Messages</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/dashboard/tutor/stats"
                        className="w-full flex items-center"
                      >
                        <PieChart className="mr-2 h-4 w-4" />
                        <span>Statistics</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="default"
                className="bg-primary hover:bg-primary-dark"
                onClick={() => navigate("/login")}
              >
                Đăng nhập
              </Button>
              <Button
                variant="default"
                className="bg-secondary hover:bg-secondary-dark"
                onClick={() => navigate("/register")}
              >
                Đăng ký
              </Button>
            </>
          )}
        </nav>
        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="px-2 py-6 flex flex-col h-full">
                {" "}
                <div className="mt-8 flex flex-col space-y-4">
                  <Link
                    href="/tutors"
                    className="px-3 py-2 text-foreground hover:bg-muted rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Tìm gia sư
                  </Link>
                  {!user && (
                    <Link
                      href="/register"
                      className="px-3 py-2 text-foreground hover:bg-muted rounded-md text-base font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Trở thành gia sư
                    </Link>
                  )}
                  <Link
                    href="/blog"
                    className="px-3 py-2 text-foreground hover:bg-muted rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Blog
                  </Link>
                </div>
                <div className="mt-auto">
                  {user ? (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center px-3 py-2">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={user.avatar || undefined}
                            alt={user.first_name}
                          />
                          <AvatarFallback>
                            {user.first_name?.[0]}
                            {user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col space-y-2">
                        <Link
                          href={getDashboardLink()}
                          className="px-3 py-2 text-foreground hover:bg-muted rounded-md text-base font-medium flex items-center"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="mr-2 h-5 w-5" />
                          Dashboard
                        </Link>
                        <button
                          className="px-3 py-2 text-foreground hover:bg-muted rounded-md text-base font-medium flex items-center text-left"
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-5 w-5" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3 p-3">
                      <Button
                        className="w-full bg-primary hover:bg-primary-dark"
                        onClick={() => {
                          navigate("/login");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Đăng nhập
                      </Button>
                      <Button
                        className="w-full bg-secondary hover:bg-secondary-dark"
                        onClick={() => {
                          navigate("/register");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Đăng ký
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
