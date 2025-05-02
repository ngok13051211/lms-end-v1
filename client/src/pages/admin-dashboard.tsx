import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, BookOpen, CheckCircle, XCircle, PlusCircle, Search, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function AdminDashboard() {
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [tutorSearchTerm, setTutorSearchTerm] = useState("");
  const [tutorFilter, setTutorFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch users with filters
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: [`/api/v1/admin/users?search=${userSearchTerm}&role=${userFilter}&page=${page}&pageSize=${pageSize}`],
  });

  // Fetch tutors verification requests
  const { data: tutorVerifications, isLoading: tutorsLoading } = useQuery({
    queryKey: [`/api/v1/admin/tutors/verification?search=${tutorSearchTerm}&status=${tutorFilter}&page=${page}&pageSize=${pageSize}`],
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/v1/admin/stats'],
  });

  // Approve tutor verification
  const approveTutorMutation = useMutation({
    mutationFn: async (tutorId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/admin/tutors/${tutorId}/approve`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/admin/tutors/verification`] });
    },
  });

  // Reject tutor verification
  const rejectTutorMutation = useMutation({
    mutationFn: async (tutorId: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/v1/admin/tutors/${tutorId}/reject`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/admin/tutors/verification`] });
    },
  });

  const isLoading = usersLoading || tutorsLoading || statsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-2 text-xl">Loading dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-medium mb-6">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-lg font-medium">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Verified Tutors</p>
                  <p className="text-lg font-medium">{stats?.verifiedTutors || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Pending Verifications</p>
                  <p className="text-lg font-medium">{stats?.pendingVerifications || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-8">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tutors">Tutor Verifications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage users registered on HomiTutor</CardDescription>
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      className="pl-10"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="tutor">Tutors</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account manually.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="firstName" className="text-sm font-medium">
                              First Name
                            </label>
                            <Input id="firstName" className="mt-1" />
                          </div>
                          <div>
                            <label htmlFor="lastName" className="text-sm font-medium">
                              Last Name
                            </label>
                            <Input id="lastName" className="mt-1" />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="email" className="text-sm font-medium">
                            Email
                          </label>
                          <Input id="email" type="email" className="mt-1" />
                        </div>
                        <div>
                          <label htmlFor="password" className="text-sm font-medium">
                            Password
                          </label>
                          <Input id="password" type="password" className="mt-1" />
                        </div>
                        <div>
                          <label htmlFor="role" className="text-sm font-medium">
                            Role
                          </label>
                          <Select>
                            <SelectTrigger id="role" className="mt-1">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="tutor">Tutor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Create User</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData?.users?.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} alt={user.firstName} />
                                <AvatarFallback>
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.firstName} {user.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "admin" ? "default" :
                                user.role === "tutor" ? "secondary" : "outline"
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.active ? "success" : "destructive"}
                            >
                              {user.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Implement edit logic */}}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={user.active ? "text-destructive" : "text-success"}
                                onClick={() => {/* Implement activation toggle */}}
                              >
                                {user.active ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!usersData?.users || usersData.users.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No users found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {usersData?.totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {usersData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(usersData.totalPages, p + 1))}
                        disabled={page === usersData.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutor Verifications Tab */}
          <TabsContent value="tutors">
            <Card>
              <CardHeader>
                <CardTitle>Tutor Verification Requests</CardTitle>
                <CardDescription>Review and approve tutor verification requests</CardDescription>
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search tutors..."
                      className="pl-10"
                      value={tutorSearchTerm}
                      onChange={(e) => setTutorSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={tutorFilter} onValueChange={setTutorFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requests</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tutor</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Experience</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tutorVerifications?.tutors?.map((tutor: any) => (
                        <TableRow key={tutor.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={tutor.user?.avatar} alt={tutor.user?.firstName} />
                                <AvatarFallback>
                                  {tutor.user?.firstName?.[0]}{tutor.user?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>{tutor.user?.firstName} {tutor.user?.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tutor.subjects?.slice(0, 3).map((subject: any) => (
                                <Badge 
                                  key={subject.id} 
                                  variant="outline" 
                                  className="mr-1"
                                >
                                  {subject.name}
                                </Badge>
                              ))}
                              {tutor.subjects?.length > 3 && (
                                <Badge variant="outline">+{tutor.subjects.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={tutor.education}>
                            {tutor.education}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={tutor.experience}>
                            {tutor.experience}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tutor.isVerified ? "success" :
                                tutor.status === "rejected" ? "destructive" : "warning"
                              }
                            >
                              {tutor.isVerified ? "Verified" : 
                               tutor.status === "rejected" ? "Rejected" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Tutor Profile Details</DialogTitle>
                                    <DialogDescription>
                                      Review the tutor's profile information
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                                    <div>
                                      <div className="flex flex-col items-center">
                                        <Avatar className="h-32 w-32 mb-4">
                                          <AvatarImage src={tutor.user?.avatar} alt={tutor.user?.firstName} />
                                          <AvatarFallback className="text-3xl">
                                            {tutor.user?.firstName?.[0]}{tutor.user?.lastName?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <h3 className="font-medium text-lg">
                                          {tutor.user?.firstName} {tutor.user?.lastName}
                                        </h3>
                                        <p className="text-muted-foreground text-sm">
                                          {tutor.user?.email}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-4">
                                      <div>
                                        <h4 className="font-medium">Hourly Rate</h4>
                                        <p className="text-secondary font-medium">
                                          {new Intl.NumberFormat('vi-VN', { 
                                            style: 'currency', 
                                            currency: 'VND'
                                          }).format(Number(tutor.hourlyRate))}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium">Teaching Mode</h4>
                                        <p>
                                          {tutor.teachingMode === "online" ? "Online" : 
                                          tutor.teachingMode === "offline" ? "In-person" : 
                                          "Online & In-person"}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium">Subjects</h4>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          {tutor.subjects?.map((subject: any) => (
                                            <Badge key={subject.id} variant="outline">
                                              {subject.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-medium">Education Levels</h4>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                          {tutor.educationLevels?.map((level: any) => (
                                            <Badge key={level.id} variant="outline">
                                              {level.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 py-4">
                                    <div>
                                      <h4 className="font-medium mb-2">Bio</h4>
                                      <p className="whitespace-pre-line text-muted-foreground">
                                        {tutor.bio}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Education</h4>
                                      <p className="whitespace-pre-line text-muted-foreground">
                                        {tutor.education}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Experience</h4>
                                      <p className="whitespace-pre-line text-muted-foreground">
                                        {tutor.experience}
                                      </p>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    {!tutor.isVerified && (
                                      <>
                                        <Button 
                                          variant="destructive" 
                                          onClick={() => rejectTutorMutation.mutate(tutor.id)}
                                          disabled={rejectTutorMutation.isPending}
                                        >
                                          {rejectTutorMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <XCircle className="mr-2 h-4 w-4" />
                                          )}
                                          Reject
                                        </Button>
                                        <Button 
                                          variant="default" 
                                          onClick={() => approveTutorMutation.mutate(tutor.id)}
                                          disabled={approveTutorMutation.isPending}
                                        >
                                          {approveTutorMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                          )}
                                          Approve
                                        </Button>
                                      </>
                                    )}
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              {!tutor.isVerified && tutor.status !== "rejected" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => rejectTutorMutation.mutate(tutor.id)}
                                    disabled={rejectTutorMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="text-white"
                                    onClick={() => approveTutorMutation.mutate(tutor.id)}
                                    disabled={approveTutorMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!tutorVerifications?.tutors || tutorVerifications.tutors.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No tutor verification requests found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                {tutorVerifications?.totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {tutorVerifications.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(tutorVerifications.totalPages, p + 1))}
                        disabled={page === tutorVerifications.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure platform-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">General Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Platform Name</label>
                          <Input defaultValue="HomiTutor" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Contact Email</label>
                          <Input defaultValue="support@homitutor.vn" className="mt-1" type="email" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Support Phone</label>
                          <Input defaultValue="1900 xxxx" className="mt-1" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Commission Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Platform Fee (%)</label>
                          <Input defaultValue="10" className="mt-1" type="number" min="0" max="100" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Minimum Withdrawal Amount (VND)</label>
                          <Input defaultValue="100000" className="mt-1" type="number" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label>New User Registration</label>
                        <input type="checkbox" defaultChecked className="toggle" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label>Tutor Verification Requests</label>
                        <input type="checkbox" defaultChecked className="toggle" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label>New Message Notifications</label>
                        <input type="checkbox" defaultChecked className="toggle" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label>Payment Notifications</label>
                        <input type="checkbox" defaultChecked className="toggle" />
                      </div>
                    </div>
                  </div>
                  <Button className="w-full md:w-auto">Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
