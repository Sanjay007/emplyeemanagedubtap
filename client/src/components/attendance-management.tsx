import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Employee, USER_ROLES, AttendanceRecord } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, RefreshCw, Search } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

// Type definition for enhanced attendance record with employee info
type EnhancedAttendanceRecord = AttendanceRecord & {
  employee?: Omit<Employee, "password">;
};

interface AttendanceManagementProps {
  employees: Employee[];
}

export default function AttendanceManagement({ employees }: AttendanceManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  // Format dates for API requests
  const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : '';
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (formattedStartDate) queryParams.append('startDate', formattedStartDate);
  if (formattedEndDate) queryParams.append('endDate', formattedEndDate);
  if (selectedEmployeeId) queryParams.append('employeeId', selectedEmployeeId);
  if (searchTerm.trim()) queryParams.append('phoneNumber', searchTerm.trim());
  
  // Fetch attendance records
  const { data: attendanceRecords, isLoading, isError, refetch } = useQuery<EnhancedAttendanceRecord[]>({
    queryKey: ['/api/attendance', formattedStartDate, formattedEndDate, selectedEmployeeId, searchTerm],
    queryFn: async () => {
      const url = `/api/attendance?${queryParams.toString()}`;
      return apiRequest(url);
    },
  });
  
  // Fetch today's attendance records
  const { data: todayAttendance, refetch: refetchToday } = useQuery<EnhancedAttendanceRecord[]>({
    queryKey: ['/api/attendance/today'],
    queryFn: async () => {
      return apiRequest('/api/attendance/today');
    },
  });
  
  // Record login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/attendance/login', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Login recorded successfully",
        description: "Your attendance has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record login",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Record logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/attendance/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Logout recorded successfully",
        description: "Your attendance has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to record logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Check if user has already logged in today
  const userTodayAttendance = todayAttendance?.find(
    record => record.employeeId === user?.id
  );
  
  const hasLoggedInToday = !!userTodayAttendance;
  const hasLoggedOutToday = !!userTodayAttendance?.logoutTime;
  
  // Filter employees based on user role
  const filteredEmployees = employees.filter(emp => {
    if (!user) return false;
    
    if (user.userType === USER_ROLES.ADMIN) {
      return true;
    } else if (user.userType === USER_ROLES.MANAGER) {
      return emp.managerId === user.id || emp.id === user.id;
    } else if (user.userType === USER_ROLES.BDM) {
      return emp.bdmId === user.id || emp.id === user.id;
    } else {
      return emp.id === user.id;
    }
  });
  
  // Format date and time for display
  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };
  
  // Get status based on login and logout times
  const getStatus = (record: EnhancedAttendanceRecord) => {
    if (!record.loginTime) return "Absent";
    return record.logoutTime ? "Present" : "Logged In";
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    refetchToday();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <h2 className="text-2xl font-bold">Attendance Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loginMutation.mutate()}
            disabled={loginMutation.isPending || hasLoggedInToday}
          >
            {loginMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Mark Attendance (Login)
          </Button>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending || !hasLoggedInToday || hasLoggedOutToday}
          >
            {logoutMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Mark Logout
          </Button>
        </div>
      </div>
      
      {/* Today's attendance status */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance Status</CardTitle>
          <CardDescription>
            {hasLoggedInToday
              ? hasLoggedOutToday
                ? "You have completed your attendance for today."
                : "You are currently logged in."
              : "You haven't logged in today."}
          </CardDescription>
        </CardHeader>
        {hasLoggedInToday && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Login Time</p>
                <p className="font-medium">
                  {userTodayAttendance?.loginTime
                    ? formatDateTime(userTodayAttendance.loginTime)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logout Time</p>
                <p className="font-medium">
                  {userTodayAttendance?.logoutTime
                    ? formatDateTime(userTodayAttendance.logoutTime)
                    : "Not logged out yet"}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Attendance Report */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Report</CardTitle>
          <CardDescription>
            View and filter attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Start */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Date Range End */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Employee Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Employee</label>
                <Select
                  value={selectedEmployeeId || "all"}
                  onValueChange={(value) =>
                    setSelectedEmployeeId(value === "all" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {filteredEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Mobile Number Search */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Mobile Number</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    title="Refresh data"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Attendance Table */}
            <div className="rounded-md border mt-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : isError ? (
                <div className="flex justify-center items-center h-32 text-red-500">
                  Failed to load attendance records. Please try again.
                </div>
              ) : attendanceRecords && attendanceRecords.length > 0 ? (
                <Table>
                  <TableCaption>Attendance records</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Logout Time</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell>
                          {record.loginTime
                            ? format(new Date(record.loginTime), "hh:mm a")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {record.logoutTime
                            ? format(new Date(record.logoutTime), "hh:mm a")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {record.employee?.employeeId || "N/A"}
                        </TableCell>
                        <TableCell>
                          {record.employee?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {record.employee?.mobile || "N/A"}
                        </TableCell>
                        <TableCell>
                          {record.employee?.userType || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            getStatus(record) === "Present" 
                              ? "default" 
                              : getStatus(record) === "Logged In" 
                                ? "outline" 
                                : "destructive"
                          }>
                            {getStatus(record)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  No attendance records found.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}