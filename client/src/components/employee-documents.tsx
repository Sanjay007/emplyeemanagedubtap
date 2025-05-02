import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

// Define document types since we can't import from shared
const DOCUMENT_TYPES = {
  OFFER_LETTER: "offer_letter",
  PAYSLIP: "payslip"
};

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, Upload, FileText, Trash2, Calendar, Download } from "lucide-react";
import { format } from "date-fns";

// Create the form schema
const documentUploadSchema = z.object({
  employeeId: z.number({
    required_error: "Employee ID is required",
  }),
  documentType: z.string({
    required_error: "Document type is required",
  }),
  documentFile: z.any().optional(),
  documentUrl: z.string().optional(),
  month: z.string().optional(),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

// Define types
interface Employee {
  id: number;
  name: string;
  employeeId: string;
  mobile: string;
}

interface EmployeeDocument {
  id: number;
  employeeId: number;
  documentType: string;
  documentUrl: string;
  month: string | null;
  uploadedBy: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup for document upload
  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      employeeId: 0,
      documentType: "",
      documentUrl: "",
      month: "",
    },
  });

  // Query for searching employees
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['/api/search-employees', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const response = await apiRequest(`/api/search-employees?q=${encodeURIComponent(searchQuery)}`);
      return response as Employee[];
    },
    enabled: !!searchQuery && searchQuery.length > 2,
  });

  // Query for fetching documents for selected employee
  const { data: employeeDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/employee-documents', selectedEmployee?.id],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      const response = await apiRequest(`/api/employee-documents/${selectedEmployee.id}`);
      return response as EmployeeDocument[];
    },
    enabled: !!selectedEmployee,
  });

  // Mutation for uploading document
  const uploadMutation = useMutation({
    mutationFn: (values: DocumentUploadFormValues) => {
      return apiRequest('/api/employee-documents', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded successfully",
        description: "The document has been uploaded for the employee.",
      });
      // Reset form and invalidate queries
      form.reset();
      if (selectedEmployee) {
        queryClient.invalidateQueries({ queryKey: ['/api/employee-documents', selectedEmployee.id] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to upload document",
        description: "An error occurred while uploading the document.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting document
  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => {
      return apiRequest(`/api/employee-documents/${documentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Document deleted successfully",
        description: "The document has been removed from the system.",
      });
      if (selectedEmployee) {
        queryClient.invalidateQueries({ queryKey: ['/api/employee-documents', selectedEmployee.id] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to delete document",
        description: "An error occurred while deleting the document.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: DocumentUploadFormValues) => {
    uploadMutation.mutate(values);
  };

  // Handle document type selection
  const handleDocumentTypeChange = (value: string) => {
    form.setValue("documentType", value);
    
    // Clear month field if not payslip
    if (value !== DOCUMENT_TYPES.PAYSLIP) {
      form.setValue("month", "");
    }
  };

  // Handle employee selection
  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchQuery(employee.name);
    form.setValue("employeeId", employee.id);
  };

  // Only admins can see this component
  if (user?.userType !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You don't have permission to access this feature.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Employee Document Management</h2>
        <p className="text-muted-foreground">Upload and manage employee documents such as offer letters and payslips.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search and Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Search Employee</CardTitle>
            <CardDescription>
              Find an employee to manage their documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search by name, ID or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {isSearching ? (
                <p>Searching...</p>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((employee: Employee) => (
                        <TableRow key={employee.id} className="cursor-pointer hover:bg-gray-100">
                          <TableCell>{employee.name}</TableCell>
                          <TableCell>{employee.employeeId}</TableCell>
                          <TableCell>{employee.mobile}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectEmployee(employee)}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : searchQuery && searchQuery.length > 2 ? (
                <p>No employees found</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Document Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Add a new document for the selected employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedEmployee ? (
              <div className="mb-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Selected Employee</AlertTitle>
                  <AlertDescription>
                    {selectedEmployee.name} ({selectedEmployee.employeeId})
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-muted-foreground">Select an employee first to upload documents</p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select
                        disabled={!selectedEmployee}
                        onValueChange={handleDocumentTypeChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={DOCUMENT_TYPES.OFFER_LETTER}>Offer Letter</SelectItem>
                          <SelectItem value={DOCUMENT_TYPES.PAYSLIP}>Payslip</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Type of document to upload
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("documentType") === DOCUMENT_TYPES.PAYSLIP && (
                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Format: YYYY-MM (e.g., 2025-05)"
                            {...field}
                            disabled={!selectedEmployee}
                          />
                        </FormControl>
                        <FormDescription>
                          Month and year for the payslip
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="documentFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Document</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf"
                            disabled={!selectedEmployee}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                field.onChange(file);
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Select a PDF document to upload (max 5MB)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={!selectedEmployee || uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    "Uploading..."
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Employee Documents List */}
      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Documents for {selectedEmployee.name}</CardTitle>
            <CardDescription>
              List of all documents uploaded for this employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDocuments ? (
              <p>Loading documents...</p>
            ) : employeeDocuments && employeeDocuments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Uploaded On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeDocuments.map((doc: EmployeeDocument) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {doc.documentType === DOCUMENT_TYPES.PAYSLIP
                          ? "Payslip"
                          : "Offer Letter"}
                      </TableCell>
                      <TableCell>
                        {doc.month ? doc.month : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.uploadedAt), "PPP")}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.documentUrl, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteMutation.mutate(doc.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4">No documents found for this employee</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}