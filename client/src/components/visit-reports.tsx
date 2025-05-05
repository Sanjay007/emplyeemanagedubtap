import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Employee, visitReportFormSchema, VisitReport, PRODUCT_TYPES } from "@shared/schema";
import { format } from "date-fns";
import { z } from "zod";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Eye, Filter, Search, MoreVertical } from "lucide-react";

type VisitReportsProps = {
  user: Employee;
};

// Form schema for creating a new visit report
const createVisitSchema = visitReportFormSchema.omit({ bdeId: true });
type CreateVisitFormValues = z.infer<typeof createVisitSchema>;

export default function VisitReports({ user }: VisitReportsProps) {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<VisitReport | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Initialize form
  const form = useForm<CreateVisitFormValues>({
    resolver: zodResolver(createVisitSchema),
    defaultValues: {
      storeName: "",
      ownerName: "",
      location: "",
      phoneNumber: "",
      photoUrl: "",
      productsInterested: []
    }
  });

  // Query to fetch visit reports
  const {
    data: visitReports = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["/api/visit-reports"],
    queryFn: async () => {
      let url = "/api/visit-reports";
      const params = new URLSearchParams();
      
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      if (locationFilter) params.append("location", locationFilter);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch visit reports");
      return res.json();
    }
  });

  // Query to fetch visit report count for today
  const { data: reportCount } = useQuery({
    queryKey: ["/api/visit-reports/count/today"],
    queryFn: async () => {
      const res = await fetch("/api/visit-reports/count/today");
      if (!res.ok) throw new Error("Failed to fetch report count");
      return res.json();
    }
  });

  // Mutation to create a new visit report
  const createVisitMutation = useMutation({
    mutationFn: async (data: CreateVisitFormValues) => {
      return apiRequest("/api/visit-reports", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Visit report created",
        description: "Your visit report has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visit-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visit-reports/count/today"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create visit report",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  function onSubmit(data: CreateVisitFormValues) {
    createVisitMutation.mutate(data);
  }

  // Handle file upload for photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue("photoUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Apply filters
  const applyFilters = () => {
    refetch();
    setIsFilterOpen(false);
  };

  // Reset filters
  const resetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setLocationFilter("");
    refetch();
    setIsFilterOpen(false);
  };

  // View report details
  const viewReport = (report: VisitReport) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  // Format date for display
  const formatDateTime = (dateString: string | Date) => {
    return format(new Date(dateString), "PPp"); // Format: "Apr 29, 2023, 1:30 PM"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Visit Reports</h2>
          <p className="text-muted-foreground">
            {user.userType === "businessdevelopmentexecutive"
              ? `You have made ${reportCount?.count || 0} visits today.`
              : `Your team has made ${reportCount?.count || 0} visits today.`}
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Filter button */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Filter Visit Reports</h4>
                <div className="space-y-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Start Date</div>
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
                  
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">End Date</div>
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
                  
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Location</div>
                    <Input
                      placeholder="Filter by location"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetFilters}>Reset</Button>
                  <Button onClick={applyFilters}>Apply Filters</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Create new report button - only for BDEs */}
          {user.userType === "businessdevelopmentexecutive" && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Visit Report
            </Button>
          )}
        </div>
      </div>
      
      {/* Visit reports table */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Report Log</CardTitle>
          <CardDescription>
            A list of all visit reports submitted by field executives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading visit reports...</p>
            </div>
          ) : visitReports.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p className="text-muted-foreground">No visit reports found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitReports.map((report: VisitReport) => (
                  <TableRow key={report.id}>
                    <TableCell>{formatDateTime(report.createdAt)}</TableCell>
                    <TableCell>{report.storeName}</TableCell>
                    <TableCell>{report.ownerName}</TableCell>
                    <TableCell>{report.location}</TableCell>
                    <TableCell>{report.phoneNumber}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Create Visit Report Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Visit Report</DialogTitle>
            <DialogDescription>
              Fill out the details of your store visit.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter store name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter owner name" {...field} />
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
                      <Input placeholder="Enter store location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Photo</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                        {field.value && (
                          <div className="mt-2">
                            <img
                              src={field.value}
                              alt="Store preview"
                              className="max-h-40 max-w-full rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="productsInterested"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Products Interested</FormLabel>
                      <FormDescription>
                        Select all products the store owner is interested in.
                      </FormDescription>
                    </div>
                    
                    {Object.entries(PRODUCT_TYPES).map(([key, value]) => (
                      <FormField
                        key={value}
                        control={form.control}
                        name="productsInterested"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(value)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValues, value]);
                                    } else {
                                      field.onChange(
                                        currentValues.filter((val) => val !== value)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {key.replace(/_/g, " ")}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createVisitMutation.isPending}>
                  {createVisitMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Visit Report Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-md">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>Visit Report Details</DialogTitle>
                <DialogDescription>
                  Submitted on {formatDateTime(selectedReport.createdAt)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedReport.photoUrl && (
                  <div className="w-full flex justify-center mb-4">
                    <img
                      src={selectedReport.photoUrl}
                      alt="Store"
                      className="max-h-60 max-w-full rounded-md"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Store Name</h4>
                    <p>{selectedReport.storeName}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Owner Name</h4>
                    <p>{selectedReport.ownerName}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                    <p>{selectedReport.location}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Phone Number</h4>
                    <p>{selectedReport.phoneNumber}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Products Interested</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.productsInterested.map((product) => (
                      <div
                        key={product}
                        className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm"
                      >
                        {product.replace(/_/g, " ")}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}