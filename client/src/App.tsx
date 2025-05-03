import { Switch, Route } from "wouter";
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
import StudentDashboard from "@/pages/student-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import BecomeTutor from "@/pages/become-tutor";
import PrivateRoute from "@/components/auth/PrivateRoute";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loadUser } from "@/features/auth/authSlice";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/tutors" component={TutorListing} />
      <Route path="/tutors/:id" component={TutorProfile} />
      <Route path="/become-tutor" component={BecomeTutor} />
      
      <Route path="/tutor-dashboard">
        <PrivateRoute role="tutor" component={TutorDashboard} />
      </Route>
      
      <Route path="/dashboard/tutor">
        <PrivateRoute role="tutor" component={TutorDashboard} />
      </Route>
      
      <Route path="/dashboard/student">
        <PrivateRoute role="student" component={StudentDashboard} />
      </Route>
      
      <Route path="/dashboard/admin">
        <PrivateRoute role="admin" component={AdminDashboard} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser() as any);
  }, [dispatch]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
