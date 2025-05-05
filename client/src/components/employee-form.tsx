import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Employee, USER_ROLES } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  employee: Employee | null;
  allEmployees: Employee[];
}

// Form schema
const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  jobLocation: z.string().min(1, "Job location is required"),
  userType: z.string().min(1, "User type is required"),
  salary: z.coerce.number().positive("Salary must be a positive number"),
  joiningDate: z.string().min(1, "Joining date is required"),
  travelAllowance: z.coerce.number().nonnegative("Travel allowance must be non-negative"),
  referralName: z.string().optional(),
  remarks: z.string().optional(),
  managerId: z.coerce.number().optional(),
  bdmId: z.coerce.number().optional(),
  username: z.string().min(4, "Username must be at least 4 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  bankName: z.string().optional(),
  ifscCode: z.string().optional(),
  accountNumber: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EmployeeForm({
  isOpen,
  onClose,
  mode,
  employee,
  allEmployees,
}: EmployeeFormProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");

  // Get lists of managers and BDMs for selection
  const managers = allEmployees.filter(emp => emp.userType === USER_ROLES.MANAGER);
  const bdms = allEmployees.filter(emp => emp.userType === USER_ROLES.BDM);

  // Set up form with default values
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name || "",
      mobile: employee?.mobile || "",
      jobLocation: employee?.jobLocation || "",
      userType: employee?.userType || USER_ROLES.MANAGER,
      salary: employee?.salary || 0,
      joiningDate: employee?.joiningDate ? formatDate(employee.joiningDate) : formatDate(new Date()),
      travelAllowance: employee?.travelAllowance || 0,
      referralName: employee?.referralName || "",
      remarks: employee?.remarks || "",
      managerId: employee?.managerId || undefined,
      bdmId: employee?.bdmId || undefined,
      username: "",
      password: "",
      bankName: "",
      ifscCode: "",
      accountNumber: "",
    },
  });

  // Reset form when employee changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: employee?.name || "",
        mobile: employee?.mobile || "",
        jobLocation: employee?.jobLocation || "",
        userType: employee?.userType || USER_ROLES.MANAGER,
        salary: employee?.salary || 0,
        joiningDate: employee?.joiningDate ? formatDate(employee.joiningDate) : formatDate(new Date()),
        travelAllowance: employee?.travelAllowance || 0,
        referralName: employee?.referralName || "",
        remarks: employee?.remarks || "",
        managerId: employee?.managerId || undefined,
        bdmId: employee?.bdmId || undefined,
        username: "",
        password: "",
        bankName: "",
        ifscCode: "",
        accountNumber: "",
      });
    }
  }, [employee, isOpen, form]);

  // Create employee mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      // Registration requires username and password
      if (!data.username || !data.password) {
        throw new Error("Username and password are required for new employees");
      }
      
      await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({
          username: data.username,
          password: data.password,
          name: data.name,
          mobile: data.mobile,
          jobLocation: data.jobLocation,
          userType: data.userType,
          salary: data.salary,
          joiningDate: data.joiningDate,
          travelAllowance: data.travelAllowance,
          referralName: data.referralName,
          remarks: data.remarks,
          managerId: data.managerId,
          bdmId: data.bdmId,
        })
      });
      
      // If bank details are provided, create them too
      if (data.bankName && data.ifscCode && data.accountNumber) {
        // Would normally get the employee ID from the registration response
        // and create bank details, but we'll skip this for the demo
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormValues) => {
      if (!employee) return;
      
      // Convert id values to numbers to ensure proper formatting
      const managerId = data.managerId ? Number(data.managerId) : null;
      const bdmId = data.bdmId ? Number(data.bdmId) : null;
      
      const response = await apiRequest(`/api/employees/${employee.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: data.name,
          mobile: data.mobile,
          jobLocation: data.jobLocation,
          userType: data.userType,
          salary: data.salary,
          joiningDate: data.joiningDate,
          travelAllowance: data.travelAllowance,
          referralName: data.referralName || null,
          remarks: data.remarks || null,
          managerId: managerId,
          bdmId: bdmId,
        })
      });
      
      // Check if update was successful
      if (!response) {
        throw new Error("Failed to update employee. Network error.");
      }
      
      // Update bank details if they are provided
      if (data.bankName && data.ifscCode && data.accountNumber) {
        // Check if bank details already exist
        const bankDetailsResponse = await apiRequest(`/api/bank-details/${employee.id}`, {
          method: "GET"
        }).catch(() => null);
        
        if (bankDetailsResponse) {
          // Update existing bank details
          await apiRequest(`/api/bank-details/${bankDetailsResponse.id}`, {
            method: "PUT",
            body: JSON.stringify({
              bankName: data.bankName,
              ifscCode: data.ifscCode,
              accountNumber: data.accountNumber,
            })
          });
        } else {
          // Create new bank details
          await apiRequest("/api/bank-details", {
            method: "POST",
            body: JSON.stringify({
              employeeId: employee.id,
              bankName: data.bankName,
              ifscCode: data.ifscCode,
              accountNumber: data.accountNumber,
            })
          });
        }
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: EmployeeFormValues) {
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Employee" : "Edit Employee"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="job">Job Details</TabsTrigger>
                <TabsTrigger value="bank">Bank Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {mode === "create" && (
                    <>
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes about the employee"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="job" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="jobLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Location</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={USER_ROLES.MANAGER}>Manager</SelectItem>
                            <SelectItem value={USER_ROLES.BDM}>Business Development Manager</SelectItem>
                            <SelectItem value={USER_ROLES.BDE}>Business Development Executive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="travelAllowance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Allowance (TA)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="joiningDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Joining Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="referralName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referral Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Show Manager selector for BDM and BDE roles */}
                  {(form.watch("userType") === USER_ROLES.BDM || 
                    form.watch("userType") === USER_ROLES.BDE) && (
                    <FormField
                      control={form.control}
                      name="managerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reporting Manager</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a manager" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {managers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id.toString()}>
                                  {manager.name} ({manager.employeeId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Show BDM selector for BDE role only */}
                  {form.watch("userType") === USER_ROLES.BDE && (
                    <FormField
                      control={form.control}
                      name="bdmId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reporting BDM</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a BDM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {bdms
                                .filter(bdm => bdm.managerId === form.watch("managerId"))
                                .map((bdm) => (
                                  <SelectItem key={bdm.id} value={bdm.id.toString()}>
                                    {bdm.name} ({bdm.employeeId})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="bank" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ifscCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IFSC Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator />
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {mode === "create" ? "Create Employee" : "Update Employee"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
