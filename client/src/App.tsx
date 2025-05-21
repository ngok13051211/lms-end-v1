import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VerifyEmail from "@/pages/verify-email";
import TutorProfile from "@/pages/tutor-profile";
import TutorListing from "@/pages/tutor-listing";
import SubjectDetail from "@/pages/subject-detail";
import Subjects from "@/pages/subjects";
import TutorDashboard from "@/pages/tutor-dashboard";
import TutorDashboardProfile from "@/pages/tutor-dashboard-profile";
import TutorDashboardCourses from "@/pages/tutor-dashboard-courses";
import TutorDashboardStats from "@/pages/tutor-dashboard-stats";
import TutorDashboardSchedule from "@/pages/tutor-dashboard-schedule";
import TutorDashboardBookings from "@/pages/tutor-dashboard-bookings";
import StudentDashboard from "@/pages/student-dashboard";
import StudentDashboardProfile from "@/pages/student-dashboard-profile";
import StudentDashboardTutors from "@/pages/student-dashboard-tutors";
import StudentDashboardBookings from "@/pages/student-dashboard-bookings";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminTutorVerification from "@/pages/admin-tutor-verification";
import AdminReports from "@/pages/admin-reports";
import AdminUsers from "@/pages/admin-users";
import AdminTutors from "@/pages/admin-tutors";
import BecomeTutor from "@/pages/become-tutor";
import BookingForm from "@/pages/booking-form";
import Payment from "@/pages/payment";
import StudentBookingDetail from "@/pages/student-booking-detail";
import TutorBookingDetail from "@/pages/tutor-booking-detail";
import DashboardMessages from "@/pages/dashboard-messages";
import PrivateRoute from "@/components/auth/PrivateRoute";
import MainLayout from "@/components/layout/MainLayout";
import { useEffect, useState, ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadUser } from "@/features/auth/authSlice";
import { RootState } from "./store";
import { Loader2 } from "lucide-react";

// Hàm wrapper để bọc component bên trong MainLayout
function withMainLayout(Component: React.ComponentType<any>): React.FC<any> {
  return (props) => (
    <MainLayout>
      <Component {...props} />
    </MainLayout>
  );
}

function Router() {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  // Show loading spinner during authentication check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading...</span>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={withMainLayout(Home)} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email/:email" component={VerifyEmail} />
      <Route path="/tutors" component={withMainLayout(TutorListing)} />
      <Route path="/tutors/:id" component={withMainLayout(TutorProfile)} />{" "}
      <Route path="/subjects" component={withMainLayout(Subjects)} />
      <Route path="/subjects/:id" component={withMainLayout(SubjectDetail)} />
      <Route path="/become-tutor" component={withMainLayout(BecomeTutor)} />
      <Route path="/book/:tutorId" component={withMainLayout(BookingForm)} />
      <Route
        path="/book/:tutorId/:courseId"
        component={withMainLayout(BookingForm)}
      />
      {/* Legacy routes - keeping for backward compatibility */}
      <Route path="/tutor-dashboard">
        <PrivateRoute role="tutor" component={TutorDashboard} />
      </Route>
      <Route path="/tutor-dashboard/profile">
        <PrivateRoute role="tutor" component={TutorDashboardProfile} />
      </Route>
      <Route path="/tutor-dashboard/courses">
        <PrivateRoute role="tutor" component={TutorDashboardCourses} />
      </Route>
      <Route path="/tutor-dashboard/ads">
        <PrivateRoute role="tutor" component={TutorDashboardCourses} />
      </Route>
      <Route path="/tutor-dashboard/messages">
        <PrivateRoute
          role="tutor"
          component={() => {
            const [, navigate] = useLocation();
            useEffect(() => {
              navigate("/dashboard/messages");
            }, [navigate]);
            return null;
          }}
        />
      </Route>
      <Route path="/tutor-dashboard/messages/:id">
        <PrivateRoute
          role="tutor"
          component={() => {
            const [, navigate] = useLocation();
            const id = window.location.pathname.split("/").pop();
            useEffect(() => {
              navigate(`/dashboard/messages/${id}`);
            }, [navigate, id]);
            return null;
          }}
        />
      </Route>
      <Route path="/tutor-dashboard/stats">
        <PrivateRoute role="tutor" component={TutorDashboardStats} />
      </Route>{" "}
      <Route path="/tutor-dashboard/schedule">
        <PrivateRoute role="tutor" component={TutorDashboardSchedule} />
      </Route>
      <Route path="/tutor-dashboard/bookings">
        <PrivateRoute role="tutor" component={TutorDashboardBookings} />
      </Route>
      {/* Main tutor dashboard route */}
      <Route path="/dashboard/tutor">
        <PrivateRoute role="tutor" component={TutorDashboard} />
      </Route>
      {/* Tutor dashboard sections */}
      <Route path="/dashboard/tutor/profile">
        <PrivateRoute role="tutor" component={TutorDashboardProfile} />
      </Route>
      <Route path="/dashboard/tutor/courses">
        <PrivateRoute role="tutor" component={TutorDashboardCourses} />
      </Route>
      <Route path="/dashboard/tutor/messages">
        <PrivateRoute
          role="tutor"
          component={() => {
            const [, navigate] = useLocation();
            useEffect(() => {
              navigate("/dashboard/messages");
            }, [navigate]);
            return null;
          }}
        />
      </Route>
      <Route path="/dashboard/tutor/messages/:id">
        <PrivateRoute
          role="tutor"
          component={() => {
            const [, navigate] = useLocation();
            const id = window.location.pathname.split("/").pop();
            useEffect(() => {
              navigate(`/dashboard/messages/${id}`);
            }, [navigate, id]);
            return null;
          }}
        />
      </Route>
      <Route path="/dashboard/tutor/stats">
        <PrivateRoute role="tutor" component={TutorDashboardStats} />
      </Route>
      <Route path="/dashboard/tutor/schedule">
        <PrivateRoute role="tutor" component={TutorDashboardSchedule} />
      </Route>
      <Route path="/dashboard/tutor/bookings">
        <PrivateRoute role="tutor" component={TutorDashboardBookings} />
      </Route>
      {/* Student dashboard */}
      <Route path="/dashboard/student">
        <PrivateRoute role="student" component={StudentDashboard} />
      </Route>
      <Route path="/dashboard/student/profile">
        <PrivateRoute role="student" component={StudentDashboardProfile} />
      </Route>
      <Route path="/dashboard/student/tutors">
        <PrivateRoute role="student" component={StudentDashboardTutors} />
      </Route>
      {/* Redirect old student messages routes to the new unified route */}
      <Route path="/dashboard/student/messages">
        <PrivateRoute
          role="student"
          component={() => {
            const [, navigate] = useLocation();
            useEffect(() => {
              navigate("/dashboard/messages");
            }, [navigate]);
            return null;
          }}
        />
      </Route>
      <Route path="/dashboard/student/messages/:id">
        <PrivateRoute
          role="student"
          component={() => {
            const [, navigate] = useLocation();
            const id = window.location.pathname.split("/").pop();
            useEffect(() => {
              navigate(`/dashboard/messages/${id}`);
            }, [navigate, id]);
            return null;
          }}
        />
      </Route>
      <Route path="/dashboard/student/bookings">
        <PrivateRoute role="student" component={StudentDashboardBookings} />
      </Route>
      {/* Admin dashboard */}
      <Route path="/admin-dashboard">
        <PrivateRoute role="admin" component={AdminDashboard} />
      </Route>
      <Route path="/admin-dashboard/tutor-verification">
        <PrivateRoute role="admin" component={AdminTutorVerification} />
      </Route>
      <Route path="/admin-dashboard/reports">
        <PrivateRoute role="admin" component={AdminReports} />
      </Route>
      <Route path="/admin-dashboard/users">
        <PrivateRoute role="admin" component={AdminUsers} />
      </Route>{" "}
      <Route path="/admin-dashboard/tutors">
        <PrivateRoute role="admin" component={AdminTutors} />
      </Route>
      {/* Booking form route */}
      <Route path="/book/:tutorId">
        <PrivateRoute role="student" component={BookingForm} />
      </Route>{" "}
      {/* Payment route */}
      <Route path="/payment">
        <PrivateRoute role="student" component={Payment} />
      </Route>
      {/* Booking detail route */} {/* Student booking detail route */}
      <Route path="/bookings/:id">
        <PrivateRoute role="student" component={StudentBookingDetail} />
      </Route>
      {/* Tutor booking detail route */}
      <Route path="/dashboard/tutor/bookings/:id">
        <PrivateRoute role="tutor" component={TutorBookingDetail} />
      </Route>
      {/* Unified messages page */}
      <Route path="/dashboard/messages">
        <PrivateRoute component={DashboardMessages} />
      </Route>
      <Route path="/dashboard/messages/:id">
        <PrivateRoute component={DashboardMessages} />
      </Route>
      {/* Redirect old messages routes to the new unified route */}
      <Route path="/messages">
        <PrivateRoute
          component={() => {
            const [, navigate] = useLocation();
            useEffect(() => {
              navigate("/dashboard/messages");
            }, [navigate]);
            return null;
          }}
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const dispatch = useDispatch();
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    // Check if token exists in localStorage on app start
    const token = localStorage.getItem("token");
    if (token) {
      dispatch(loadUser() as any).finally(() => {
        setAuthLoaded(true);
      });
    } else {
      setAuthLoaded(true);
    }
  }, [dispatch]);

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter>
        <Router />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
