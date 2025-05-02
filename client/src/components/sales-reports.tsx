import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  SalesReport, 
  Product,
  salesReportFormSchema, 
  PAYMENT_MODES,
  USER_ROLES
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  FileCheck, 
  Filter, 
  FilePlus, 
  Check, 
  Calendar, 
  Search 
} from "lucide-react";
import { format } from "date-fns";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

type SalesReportFormValues = z.infer<typeof salesReportFormSchema>;

interface SalesReportsProps {
  user: any; // Using 'any' for simplicity, should ideally use the proper Employee type
}

export default function SalesReports({ user }: SalesReportsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SalesReport | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [locationFilter, setLocationFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState<number | undefined>();
  const [yearFilter, setYearFilter] = useState<number | undefined>();
  const { toast } = useToast();

  // Form setup for creating sales reports
  const form = useForm<SalesReportFormValues>({
    resolver: zodResolver(salesReportFormSchema),
    defaultValues: {
      merchantName: "",
      merchantMobile: "",
      location: "",
      amount: 0,
      transactionId: "",
      paymentMode: "",
      productId: 0,
    },
  });

  // Query to fetch products for dropdown
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Query to fetch today's sales points
  const { data: todayStats } = useQuery({
    queryKey: ["/api/sales-reports/stats/today"],
    queryFn: async () => {
      const res = await fetch("/api/sales-reports/stats/today");
      if (!res.ok) throw new Error("Failed to fetch today's stats");
      return res.json();
    },
  });

  // Query to fetch month's sales points
  const { data: monthStats } = useQuery({
    queryKey: ["/api/sales-reports/stats/month"],
    queryFn: async () => {
      const res = await fetch("/api/sales-reports/stats/month");
      if (!res.ok) throw new Error("Failed to fetch month's stats");
      return res.json();
    },
  });

  // Query to fetch employees based on hierarchy
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  // State for hierarchical filtering
  const [selectedBdmId, setSelectedBdmId] = useState<number | undefined>(undefined);
  const [selectedBdeId, setSelectedBdeId] = useState<number | undefined>(undefined);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);

  // Get BDMs based on user role
  const availableBdms = useMemo(() => {
    if (user.userType === USER_ROLES.MANAGER) {
      return employees.filter((emp: any) => 
        emp.userType === USER_ROLES.BDM && emp.managerId === user.id
      );
    } else if (user.userType === USER_ROLES.BDM) {
      // If user is BDM, only show themselves
      return employees.filter((emp: any) => emp.id === user.id);
    }
    // Admin can see all BDMs
    return employees.filter((emp: any) => emp.userType === USER_ROLES.BDM);
  }, [employees, user]);

  // Get BDEs based on selected BDM
  const availableBdes = useMemo(() => {
    if (!selectedBdmId) {
      if (user.userType === USER_ROLES.BDE) {
        // If user is BDE, only show themselves
        return employees.filter((emp: any) => emp.id === user.id);
      } else if (user.userType === USER_ROLES.BDM) {
        // If user is BDM, show all BDEs under them
        return employees.filter((emp: any) => 
          emp.userType === USER_ROLES.BDE && emp.bdmId === user.id
        );
      } else if (user.userType === USER_ROLES.MANAGER) {
        // If manager but no BDM selected, show all BDEs under all BDMs under the manager
        const bdmsUnderManager = employees.filter((emp: any) => 
          emp.userType === USER_ROLES.BDM && emp.managerId === user.id
        ).map((bdm: any) => bdm.id);
        
        return employees.filter((emp: any) => 
          emp.userType === USER_ROLES.BDE && bdmsUnderManager.includes(emp.bdmId)
        );
      }
      // Admin can see all BDEs
      return employees.filter((emp: any) => emp.userType === USER_ROLES.BDE);
    }
    
    // Filter BDEs by selected BDM
    return employees.filter((emp: any) => 
      emp.userType === USER_ROLES.BDE && emp.bdmId === selectedBdmId
    );
  }, [employees, selectedBdmId, user]);

  // Query to fetch sales reports with enhanced filtering
  const {
    data: salesReports = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["/api/sales-reports", selectedBdmId, selectedBdeId, selectedProductId],
    queryFn: async () => {
      let url = "/api/sales-reports";
      const params = new URLSearchParams();
      
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      if (locationFilter) params.append("location", locationFilter);
      if (monthFilter !== undefined && yearFilter !== undefined) {
        params.append("month", monthFilter.toString());
        params.append("year", yearFilter.toString());
      }
      
      // Add hierarchical filters
      if (selectedBdeId) params.append("bdeId", selectedBdeId.toString());
      else if (selectedBdmId) params.append("bdmId", selectedBdmId.toString());
      
      if (selectedProductId) params.append("productId", selectedProductId.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch sales reports");
      return res.json();
    }
  });

  // Query to fetch pending sales reports (for admins only)
  const { data: pendingSalesReports = [] } = useQuery({
    queryKey: ["/api/sales-reports/pending"],
    queryFn: async () => {
      if (user.userType !== USER_ROLES.ADMIN) return [];
      
      const res = await fetch("/api/sales-reports/pending");
      if (!res.ok) throw new Error("Failed to fetch pending sales reports");
      return res.json();
    },
    enabled: user.userType === USER_ROLES.ADMIN
  });

  // Mutation to create a new sales report
  const createSalesReportMutation = useMutation({
    mutationFn: async (data: SalesReportFormValues) => {
      return apiRequest("/api/sales-reports", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sales report created",
        description: "Your sales report has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports/stats/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports/stats/month"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create sales report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to approve a sales report (admin only)
  const approveSalesReportMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/sales-reports/${id}/approve`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Sales report approved",
        description: "The sales report has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports/stats/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-reports/stats/month"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve sales report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(data: SalesReportFormValues) {
    createSalesReportMutation.mutate(data);
  }

  // View report details
  function viewReport(report: SalesReport) {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  }

  // Apply filters
  function applyFilters() {
    refetch();
    setIsFilterOpen(false);
  }

  // Reset filters
  function resetFilters() {
    setStartDate(undefined);
    setEndDate(undefined);
    setLocationFilter("");
    setMonthFilter(undefined);
    setYearFilter(undefined);
    setSelectedBdmId(undefined);
    setSelectedBdeId(undefined);
    setSelectedProductId(undefined);
    refetch();
    setIsFilterOpen(false);
  }

  // Approve a report (admin only)
  function approveReport(id: number) {
    approveSalesReportMutation.mutate(id);
  }
  
  // BDM Performance data
  const [expandedBdm, setExpandedBdm] = useState<number | null>(null);
  
  // Get BDM performance stats
  // Define types for BDM and BDE performance data
  interface BDEPerformance {
    id: number;
    name: string;
    saleAmount: number;
    points: number;
    target: number;
    achieved: number;
    pending: number;
    completedTarget: boolean;
  }
  
  interface BDMPerformance {
    id: number;
    name: string;
    totalBdes: number;
    totalSaleAmount: number;
    totalPoints: number;
    target: number;
    achieved: number;
    pending: number;
    bdePerformanceData: BDEPerformance[];
  }

  const bdmPerformanceData = useMemo(() => {
    return availableBdms.map((bdm) => {
      // Get all BDEs under this BDM
      const bdesUnderBdm = employees.filter((emp) => 
        emp.userType === USER_ROLES.BDE && emp.bdmId === bdm.id
      );
      
      // Calculate total BDEs
      const totalBdes = bdesUnderBdm.length;
      
      // Filter sales reports for this BDM
      const bdmSalesReports = salesReports.filter((report: SalesReport) => {
        const reporter = employees.find((emp) => emp.id === report.bdeId);
        return reporter && reporter.bdmId === bdm.id;
      });
      
      // Calculate total sales amount
      const totalSaleAmount = bdmSalesReports.reduce((sum: number, report: SalesReport) => 
        sum + report.amount, 0
      );
      
      // Calculate total points
      const totalPoints = bdmSalesReports.reduce((sum: number, report: SalesReport) => 
        sum + (report.points || 0), 0
      );
      
      // Mock target for demo - in real app this would come from the database
      const target = 500;
      const achieved = totalPoints;
      const pending = Math.max(0, target - achieved);
      
      // Get BDE performance data
      const bdePerformanceData = bdesUnderBdm.map((bde) => {
        const bdeSalesReports = salesReports.filter((report: SalesReport) => 
          report.bdeId === bde.id
        );
        
        const bdeSaleAmount = bdeSalesReports.reduce((sum: number, report: SalesReport) => 
          sum + report.amount, 0
        );
        
        const bdePoints = bdeSalesReports.reduce((sum: number, report: SalesReport) => 
          sum + (report.points || 0), 0
        );
        
        // Mock target for demo - in real app this would come from the database
        const bdeTarget = 100;
        const bdeAchieved = bdePoints;
        const bdePending = Math.max(0, bdeTarget - bdeAchieved);
        
        return {
          id: bde.id,
          name: bde.name,
          saleAmount: bdeSaleAmount,
          points: bdePoints,
          target: bdeTarget,
          achieved: bdeAchieved,
          pending: bdePending,
          completedTarget: bdeAchieved >= bdeTarget
        };
      });
      
      return {
        id: bdm.id,
        name: bdm.name,
        totalBdes,
        totalSaleAmount,
        totalPoints: totalPoints,
        target,
        achieved,
        pending,
        bdePerformanceData
      };
    });
  }, [availableBdms, employees, salesReports]) as BDMPerformance[];

  // Generate current year and months for filter
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Sales Points
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayStats?.points || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Points generated today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month's Sales Points
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthStats?.points || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Points generated this month
            </p>
          </CardContent>
        </Card>
        
        {user.userType === USER_ROLES.ADMIN && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingSalesReports.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Sales reports waiting for approval
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales Reports List Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sales Reports</CardTitle>
            <CardDescription>
              View and manage sales reports
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsFilterOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            {user.userType === USER_ROLES.BDE && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <FilePlus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">Loading sales reports...</div>
          ) : (
            <Table>
              <TableCaption>List of sales reports</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      No sales reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesReports.map((report: SalesReport) => {
                    const product = products.find((p: Product) => p.id === report.productId);
                    return (
                      <TableRow key={report.id}>
                        <TableCell>{report.merchantName}</TableCell>
                        <TableCell>{report.location}</TableCell>
                        <TableCell>{product?.name || "Unknown"}</TableCell>
                        <TableCell>{report.amount}</TableCell>
                        <TableCell>{report.points}</TableCell>
                        <TableCell>
                          {format(new Date(report.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === "approved" ? "default" : "outline"}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewReport(report)}
                          >
                            View
                          </Button>
                          {user.userType === USER_ROLES.ADMIN && report.status === "pending" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => approveReport(report.id)}
                              disabled={approveSalesReportMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* BDM Performance Summary Card - Only visible for Managers and Admins */}
      {(user.userType === USER_ROLES.MANAGER || user.userType === USER_ROLES.ADMIN) && 
      bdmPerformanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>BDM Performance Summary</CardTitle>
            <CardDescription>
              Detailed performance metrics for BDMs and their BDEs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {bdmPerformanceData.map((bdm: BDMPerformance) => (
                <div key={bdm.id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex justify-between items-center p-4 cursor-pointer bg-muted/40 hover:bg-muted/60 transition-colors"
                    onClick={() => setExpandedBdm(expandedBdm === bdm.id ? null : bdm.id)}
                  >
                    <h3 className="text-lg font-semibold">{bdm.name}</h3>
                    <Button variant="ghost" size="sm">
                      {expandedBdm === bdm.id ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                  
                  <div className="p-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total BDEs</p>
                        <p className="text-lg font-semibold">{bdm.totalBdes}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Sale Amount</p>
                        <p className="text-lg font-semibold">₹ {bdm.totalSaleAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Points</p>
                        <p className="text-lg font-semibold">{bdm.totalPoints} Points</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Target</p>
                        <p className="text-lg font-semibold">{bdm.target} Points</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Achieved</p>
                        <p className="text-lg font-semibold">{bdm.achieved} Points</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <p className="text-lg font-semibold">{bdm.pending} Points</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* BDE List - Only visible when BDM is expanded */}
                  {expandedBdm === bdm.id && bdm.bdePerformanceData.length > 0 && (
                    <div className="p-4 border-t">
                      <h4 className="text-md font-semibold mb-3">BDE List Under {bdm.name}</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>BDE Name</TableHead>
                            <TableHead>Sale Amount</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Achieved</TableHead>
                            <TableHead>Pending</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bdm.bdePerformanceData.map((bde: BDEPerformance) => (
                            <TableRow key={bde.id}>
                              <TableCell>{bde.name}</TableCell>
                              <TableCell>₹ {bde.saleAmount.toLocaleString()}</TableCell>
                              <TableCell>{bde.points} Points</TableCell>
                              <TableCell>{bde.target} Points</TableCell>
                              <TableCell className="flex items-center">
                                {bde.achieved} Points
                                {bde.completedTarget && (
                                  <Check className="h-4 w-4 ml-1 text-green-500" />
                                )}
                              </TableCell>
                              <TableCell>{bde.pending} Points</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Sales Report Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Sales Report</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="merchantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter merchant name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="merchantMobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Merchant Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter amount" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="transactionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter transaction ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_MODES).map(([key, value]) => (
                          <SelectItem key={value} value={value}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product: Product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} ({product.points} points)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createSalesReportMutation.isPending}
                >
                  {createSalesReportMutation.isPending ? "Creating..." : "Submit Report"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Sales Reports</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <div className="text-sm font-medium mb-2">Date Range</div>
              <div className="flex space-x-2">
                <div className="space-y-1 flex-1">
                  <div className="text-xs text-muted-foreground">Start Date</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {startDate ? (
                          format(startDate, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1 flex-1">
                  <div className="text-xs text-muted-foreground">End Date</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {endDate ? (
                          format(endDate, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium">Month Selection</div>
              <div className="flex space-x-2">
                <Select
                  onValueChange={(value) => setMonthFilter(parseInt(value))}
                  value={monthFilter?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  onValueChange={(value) => setYearFilter(parseInt(value))}
                  value={yearFilter?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Hierarchical Filter - Show based on user role */}
            {(user.userType === USER_ROLES.ADMIN || user.userType === USER_ROLES.MANAGER) && (
              <div className="space-y-1">
                <div className="text-sm font-medium">BDM Selection</div>
                <Select
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedBdmId(undefined);
                    } else {
                      setSelectedBdmId(parseInt(value));
                    }
                    setSelectedBdeId(undefined); // Reset BDE when BDM changes
                  }}
                  value={selectedBdmId?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BDM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">All BDMs</SelectItem>
                    {availableBdms.map((bdm: any) => (
                      <SelectItem key={bdm.id} value={bdm.id.toString()}>
                        {bdm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* BDE Selection - Show if BDM is selected or user is BDM */}
            {((selectedBdmId !== undefined) || user.userType === USER_ROLES.BDM) && (
              <div className="space-y-1">
                <div className="text-sm font-medium">BDE Selection</div>
                <Select
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setSelectedBdeId(undefined);
                    } else {
                      setSelectedBdeId(parseInt(value));
                    }
                  }}
                  value={selectedBdeId?.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select BDE" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">All BDEs</SelectItem>
                    {availableBdes.map((bde: any) => (
                      <SelectItem key={bde.id} value={bde.id.toString()}>
                        {bde.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-1">
              <div className="text-sm font-medium">Product</div>
              <Select
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedProductId(undefined);
                  } else {
                    setSelectedProductId(parseInt(value));
                  }
                }}
                value={selectedProductId?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all" value="all">All Products</SelectItem>
                  {products.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium">Location</div>
              <div className="flex">
                <Input
                  placeholder="Filter by location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      {selectedReport && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sales Report Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Merchant Name</div>
                  <div>{selectedReport.merchantName}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Mobile Number</div>
                  <div>{selectedReport.merchantMobile}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-1">Location</div>
                <div>{selectedReport.location}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Amount</div>
                  <div>₹{selectedReport.amount}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Transaction ID</div>
                  <div>{selectedReport.transactionId}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Payment Mode</div>
                  <div className="capitalize">{selectedReport.paymentMode}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Product</div>
                  <div>
                    {products.find((p: Product) => p.id === selectedReport.productId)?.name || "Unknown"}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Points</div>
                  <div>{selectedReport.points}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Status</div>
                  <Badge variant={selectedReport.status === "approved" ? "default" : "outline"}>
                    {selectedReport.status}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Created On</div>
                  <div>
                    {format(new Date(selectedReport.createdAt), "PPP p")}
                  </div>
                </div>
                {selectedReport.approvedAt && (
                  <div>
                    <div className="text-sm font-medium mb-1">Approved On</div>
                    <div>
                      {format(new Date(selectedReport.approvedAt), "PPP p")}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsViewModalOpen(false)}>
                Close
              </Button>
              {user.userType === USER_ROLES.ADMIN && selectedReport.status === "pending" && (
                <Button 
                  variant="default"
                  onClick={() => {
                    approveReport(selectedReport.id);
                    setIsViewModalOpen(false);
                  }}
                  disabled={approveSalesReportMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {approveSalesReportMutation.isPending ? "Approving..." : "Approve Report"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}