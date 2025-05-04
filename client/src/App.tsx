import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import TutorProfile from "@/pages/tutor-profile";
import TutorListing from "@/pages/tutor-listing";
import TutorDashboard from "@/pages/tutor-dashboard";
import TutorDashboardProfile from "@/pages/tutor-dashboard-profile";
import TutorDashboardAds from "@/pages/tutor-dashboard-ads";
import TutorDashboardMessages from "@/pages/tutor-dashboard-messages";
import TutorDashboardStats from "@/pages/tutor-dashboard-stats";
import StudentDashboard from "@/pages/student-dashboard";
import StudentDashboardProfile from "@/pages/student-dashboard-profile";
import StudentDashboardTutors from "@/pages/student-dashboard-tutors";
import StudentDashboardMessages from "@/pages/student-dashboard-messages";
import AdminDashboard from "@/pages/admin-dashboard";
import BecomeTutor from "@/pages/become-tutor";
import PrivateRoute from "@/components/auth/PrivateRoute";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadUser } from "@/features/auth/authSlice";
import { RootState } from "./store";
import { Loader2 } from "lucide-react";

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
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/tutors" component={TutorListing} />
      <Route path="/tutors/:id" component={TutorProfile} />
      <Route path="/become-tutor" component={BecomeTutor} />
      
      {/* Legacy routes - keeping for backward compatibility */}
      <Route path="/tutor-dashboard">
        <PrivateRoute role="tutor" component={TutorDashboard} />
      </Route>
      
      <Route path="/tutor-dashboard/profile">
        <PrivateRoute role="tutor" component={TutorDashboardProfile} />
      </Route>
      
      <Route path="/tutor-dashboard/ads">
        <PrivateRoute role="tutor" component={TutorDashboardAds} />
      </Route>
      
      <Route path="/tutor-dashboard/messages">
        <PrivateRoute role="tutor" component={TutorDashboardMessages} />
      </Route>
      
      <Route path="/tutor-dashboard/messages/:id">
        <PrivateRoute role="tutor" component={TutorDashboardMessages} />
      </Route>
      
      <Route path="/tutor-dashboard/stats">
        <PrivateRoute role="tutor" component={TutorDashboardStats} />
      </Route>
      
      {/* Main tutor dashboard route */}
      <Route path="/dashboard/tutor">
        <PrivateRoute role="tutor" component={TutorDashboard} />
      </Route>
      
      {/* Tutor dashboard sections */}
      <Route path="/dashboard/tutor/profile">
        <PrivateRoute role="tutor" component={TutorDashboardProfile} />
      </Route>
      
      <Route path="/dashboard/tutor/ads">
        <PrivateRoute role="tutor" component={TutorDashboardAds} />
      </Route>
      
      <Route path="/dashboard/tutor/messages">
        <PrivateRoute role="tutor" component={TutorDashboardMessages} />
      </Route>
      
      <Route path="/dashboard/tutor/messages/:id">
        <PrivateRoute role="tutor" component={TutorDashboardMessages} />
      </Route>
      
      <Route path="/dashboard/tutor/stats">
        <PrivateRoute role="tutor" component={TutorDashboardStats} />
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
      
      <Route path="/dashboard/student/messages">
        <PrivateRoute role="student" component={StudentDashboardMessages} />
      </Route>
      
      <Route path="/dashboard/student/messages/:id">
        <PrivateRoute role="student" component={StudentDashboardMessages} />
      </Route>
      
      {/* Admin dashboard */}
      <Route path="/dashboard/admin">
        <PrivateRoute role="admin" component={AdminDashboard} />
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
