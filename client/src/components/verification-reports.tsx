import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, FilePlus, Filter, Eye, FileEdit, Download } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  VerificationReport, 
  verificationReportFormSchema, 
  VerificationReportFormData,
  USER_ROLES, 
  VERIFICATION_STATUSES,
} from "@shared/schema";
import { cn } from "@/lib/utils";

interface VerificationReportsProps {
  user: any; // Using 'any' for simplicity, should ideally use the proper Employee type
}

export default function VerificationReports({ user }: VerificationReportsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<VerificationReport | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // References for file inputs
  const videoRef = useRef<HTMLInputElement>(null);
  const shopPhotoRef = useRef<HTMLInputElement>(null);
  const ownerPhotoRef = useRef<HTMLInputElement>(null);
  const aadhaarPhotoRef = useRef<HTMLInputElement>(null);
  const panPhotoRef = useRef<HTMLInputElement>(null);
  const storeOutsidePhotoRef = useRef<HTMLInputElement>(null);

  // Form setup for creating verification reports
  const form = useForm<VerificationReportFormData>({
    resolver: zodResolver(verificationReportFormSchema),
    defaultValues: {
      merchantName: "",
      mobileNumber: "",
      businessName: "",
      fullAddress: "",
      verificationVideo: "",
      shopPhoto: "",
      shopOwnerPhoto: "",
      aadhaarCardPhoto: "",
      panCardPhoto: "",
      storeOutsidePhoto: "",
    },
  });

  // Function to handle file selection and convert to base64
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof VerificationReportFormData
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue(fieldName, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to capture from camera
  const captureFromCamera = (
    fieldName: keyof VerificationReportFormData,
    isVideo: boolean = false
  ) => {
    // Create a video element to show the camera stream
    const videoEl = document.createElement("video");
    videoEl.style.width = "100%";
    videoEl.style.height = "auto";
    videoEl.autoplay = true;
    
    // Create a popup/modal to show the camera stream
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = "100%";
    popup.style.height = "100%";
    popup.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    popup.style.zIndex = "1000";
    popup.style.display = "flex";
    popup.style.flexDirection = "column";
    popup.style.justifyContent = "center";
    popup.style.alignItems = "center";
    
    // Button to capture
    const captureBtn = document.createElement("button");
    captureBtn.textContent = isVideo ? "Stop Recording" : "Capture";
    captureBtn.style.padding = "10px 20px";
    captureBtn.style.margin = "10px";
    captureBtn.style.backgroundColor = "#2563eb";
    captureBtn.style.color = "white";
    captureBtn.style.border = "none";
    captureBtn.style.borderRadius = "5px";
    captureBtn.style.cursor = "pointer";
    
    // Button to cancel
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "10px 20px";
    cancelBtn.style.margin = "10px";
    cancelBtn.style.backgroundColor = "#ef4444";
    cancelBtn.style.color = "white";
    cancelBtn.style.border = "none";
    cancelBtn.style.borderRadius = "5px";
    cancelBtn.style.cursor = "pointer";
    
    // Container for buttons
    const btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.justifyContent = "center";
    btnContainer.style.margin = "10px";
    
    btnContainer.appendChild(captureBtn);
    btnContainer.appendChild(cancelBtn);
    
    popup.appendChild(videoEl);
    popup.appendChild(btnContainer);
    
    document.body.appendChild(popup);
    
    // Access the camera
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: isVideo,
      })
      .then((stream) => {
        videoEl.srcObject = stream;
        
        let mediaRecorder: MediaRecorder | null = null;
        let recordedChunks: BlobPart[] = [];
        
        if (isVideo) {
          // Setup video recording
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recordedChunks.push(e.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              form.setValue(fieldName, base64String);
            };
            reader.readAsDataURL(blob);
          };
          
          // Start recording
          mediaRecorder.start();
        }
        
        captureBtn.onclick = () => {
          if (isVideo) {
            if (mediaRecorder) {
              mediaRecorder.stop();
            }
          } else {
            // For image capture
            const canvas = document.createElement("canvas");
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const base64String = canvas.toDataURL("image/jpeg");
            form.setValue(fieldName, base64String);
          }
          
          // Close the stream and popup
          const stream = videoEl.srcObject as MediaStream;
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop());
          document.body.removeChild(popup);
        };
        
        cancelBtn.onclick = () => {
          // Close the stream and popup
          const stream = videoEl.srcObject as MediaStream;
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop());
          document.body.removeChild(popup);
        };
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
        document.body.removeChild(popup);
        toast({
          title: "Camera Error",
          description: "Could not access your camera. Please check permissions.",
          variant: "destructive",
        });
      });
  };

  // Query to fetch verification reports with filters
  const {
    data: verificationReports = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["/api/verification-reports", startDate, endDate, statusFilter, searchQuery],
    queryFn: async () => {
      let url = "/api/verification-reports";
      const params = new URLSearchParams();
      
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("query", searchQuery);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch verification reports");
      return res.json();
    }
  });

  // Mutation to create a new verification report
  const createVerificationReportMutation = useMutation({
    mutationFn: async (data: VerificationReportFormData) => {
      return apiRequest("/api/verification-reports", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification report created",
        description: "Your verification report has been successfully created and is pending approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-reports"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create verification report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to update a verification report (for rejected reports)
  const updateVerificationReportMutation = useMutation({
    mutationFn: async (data: { id: number; formData: VerificationReportFormData }) => {
      return apiRequest(`/api/verification-reports/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.formData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification report updated",
        description: "Your verification report has been successfully updated and is pending approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-reports"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update verification report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const queryClient = useQueryClient();

  // Form submission handler
  function onSubmit(data: VerificationReportFormData) {
    // Check if it's an update or create
    if (selectedReport && selectedReport.status === VERIFICATION_STATUSES.REJECTED) {
      updateVerificationReportMutation.mutate({
        id: selectedReport.id,
        formData: data
      });
    } else {
      createVerificationReportMutation.mutate(data);
    }
  }

  // View report details
  function viewReport(report: VerificationReport) {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  }

  // Edit rejected report
  function editReport(report: VerificationReport) {
    setSelectedReport(report);
    
    // Pre-fill the form with existing data
    form.reset({
      merchantName: report.merchantName,
      mobileNumber: report.mobileNumber,
      businessName: report.businessName,
      fullAddress: report.fullAddress,
      verificationVideo: report.verificationVideo,
      shopPhoto: report.shopPhoto,
      shopOwnerPhoto: report.shopOwnerPhoto,
      aadhaarCardPhoto: report.aadhaarCardPhoto,
      panCardPhoto: report.panCardPhoto,
      storeOutsidePhoto: report.storeOutsidePhoto,
    });
    
    setIsCreateModalOpen(true);
  }

  // Apply filters
  function applyFilters() {
    refetch();
    setIsFilterOpen(false);
  }

  return (
    <>
      {/* Verification Reports Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Verification Reports</CardTitle>
            <CardDescription>
              View and manage merchant verification reports
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsFilterOpen(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            {user.userType === USER_ROLES.BDE && (
              <Button onClick={() => {
                setSelectedReport(null);
                form.reset();
                setIsCreateModalOpen(true);
              }}>
                <FilePlus className="h-4 w-4 mr-2" />
                Add Verification
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">Loading verification reports...</div>
          ) : (
            <Table>
              <TableCaption>List of verification reports</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant Name</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {user.userType === USER_ROLES.ADMIN && (
                    <TableHead>Rejection Reason</TableHead>
                  )}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verificationReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user.userType === USER_ROLES.ADMIN ? 7 : 6} className="text-center py-6">
                      No verification reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  verificationReports.map((report: VerificationReport) => (
                    <TableRow key={report.id}>
                      <TableCell>{report.merchantName}</TableCell>
                      <TableCell>{report.businessName}</TableCell>
                      <TableCell>{report.mobileNumber}</TableCell>
                      <TableCell>
                        {format(new Date(report.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            report.status === VERIFICATION_STATUSES.APPROVED 
                              ? "default" 
                              : report.status === VERIFICATION_STATUSES.REJECTED
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      {user.userType === USER_ROLES.ADMIN && (
                        <TableCell>
                          {report.rejectionReason ? (
                            <span className="text-xs text-red-500">{report.rejectionReason}</span>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewReport(report)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user.userType === USER_ROLES.BDE && 
                         report.status === VERIFICATION_STATUSES.REJECTED && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editReport(report)}
                          >
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        )}
                        {user.userType === USER_ROLES.ADMIN && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Download report data as JSON (without media)
                              const { 
                                verificationVideo, shopPhoto, shopOwnerPhoto,
                                aadhaarCardPhoto, panCardPhoto, storeOutsidePhoto,
                                ...reportWithoutMedia 
                              } = report;
                              
                              const dataStr = "data:text/json;charset=utf-8," + 
                                encodeURIComponent(JSON.stringify(reportWithoutMedia, null, 2));
                              const downloadAnchorNode = document.createElement('a');
                              downloadAnchorNode.setAttribute("href", dataStr);
                              downloadAnchorNode.setAttribute("download", `verification-${report.id}.json`);
                              document.body.appendChild(downloadAnchorNode);
                              downloadAnchorNode.click();
                              downloadAnchorNode.remove();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Verification Report Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport ? "Update Verification Report" : "Add Verification Report"}
            </DialogTitle>
            <DialogDescription>
              {selectedReport 
                ? "Update the verification details for the merchant." 
                : "Add verification details for a new merchant."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="merchantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Merchant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registered Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Mobile number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Complete business address" 
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="verificationVideo"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Verification Video (Max 60 seconds)</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => captureFromCamera("verificationVideo", true)}
                      >
                        Open Camera
                      </Button>
                      <span className="text-sm text-gray-500">or</span>
                      <Input
                        ref={videoRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileChange(e, "verificationVideo")}
                        className="max-w-xs"
                      />
                    </div>
                    {value && (
                      <div className="mt-2">
                        <video 
                          src={value} 
                          controls 
                          className="max-h-[200px] border rounded-md" 
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shopPhoto"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Shop Photo</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => captureFromCamera("shopPhoto")}
                        >
                          Open Camera
                        </Button>
                        <span className="text-sm text-gray-500">or</span>
                        <Input
                          ref={shopPhotoRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "shopPhoto")}
                        />
                      </div>
                      {value && (
                        <div className="mt-2">
                          <img 
                            src={value} 
                            alt="Shop" 
                            className="max-h-[100px] border rounded-md" 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shopOwnerPhoto"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Shop Owner Photo</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => captureFromCamera("shopOwnerPhoto")}
                        >
                          Open Camera
                        </Button>
                        <span className="text-sm text-gray-500">or</span>
                        <Input
                          ref={ownerPhotoRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "shopOwnerPhoto")}
                        />
                      </div>
                      {value && (
                        <div className="mt-2">
                          <img 
                            src={value} 
                            alt="Shop Owner" 
                            className="max-h-[100px] border rounded-md" 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aadhaarCardPhoto"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Card Photo</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => captureFromCamera("aadhaarCardPhoto")}
                        >
                          Open Camera
                        </Button>
                        <span className="text-sm text-gray-500">or</span>
                        <Input
                          ref={aadhaarPhotoRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "aadhaarCardPhoto")}
                        />
                      </div>
                      {value && (
                        <div className="mt-2">
                          <img 
                            src={value} 
                            alt="Aadhaar Card" 
                            className="max-h-[100px] border rounded-md" 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="panCardPhoto"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>PAN Card Photo</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => captureFromCamera("panCardPhoto")}
                        >
                          Open Camera
                        </Button>
                        <span className="text-sm text-gray-500">or</span>
                        <Input
                          ref={panPhotoRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "panCardPhoto")}
                        />
                      </div>
                      {value && (
                        <div className="mt-2">
                          <img 
                            src={value} 
                            alt="PAN Card" 
                            className="max-h-[100px] border rounded-md" 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storeOutsidePhoto"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Store Outside Photo</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => captureFromCamera("storeOutsidePhoto")}
                        >
                          Open Camera
                        </Button>
                        <span className="text-sm text-gray-500">or</span>
                        <Input
                          ref={storeOutsidePhotoRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "storeOutsidePhoto")}
                        />
                      </div>
                      {value && (
                        <div className="mt-2">
                          <img 
                            src={value} 
                            alt="Store Outside" 
                            className="max-h-[100px] border rounded-md" 
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedReport && selectedReport.status === VERIFICATION_STATUSES.REJECTED && (
                <div className="p-4 border border-red-300 bg-red-50 rounded-md">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Rejection Reason:</h4>
                  <p className="text-sm text-red-700">{selectedReport.rejectionReason}</p>
                </div>
              )}

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
                  disabled={createVerificationReportMutation.isPending || updateVerificationReportMutation.isPending}
                >
                  {createVerificationReportMutation.isPending || updateVerificationReportMutation.isPending
                    ? "Submitting..."
                    : selectedReport 
                      ? "Update Verification" 
                      : "Submit Verification"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Verification Report Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Verification Report</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Merchant Name</h3>
                  <p>{selectedReport.merchantName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Mobile Number</h3>
                  <p>{selectedReport.mobileNumber}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Business Name</h3>
                  <p>{selectedReport.businessName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <Badge 
                    variant={
                      selectedReport.status === VERIFICATION_STATUSES.APPROVED 
                        ? "default" 
                        : selectedReport.status === VERIFICATION_STATUSES.REJECTED
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {selectedReport.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Full Address</h3>
                <p>{selectedReport.fullAddress}</p>
              </div>

              {selectedReport.status === VERIFICATION_STATUSES.REJECTED && selectedReport.rejectionReason && (
                <div className="p-4 border border-red-300 bg-red-50 rounded-md">
                  <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                  <p className="text-sm text-red-700">{selectedReport.rejectionReason}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Verification Video</h3>
                <video 
                  src={selectedReport.verificationVideo} 
                  controls 
                  className="w-full max-h-[300px] border rounded-md" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Shop Photo</h3>
                  <img 
                    src={selectedReport.shopPhoto} 
                    alt="Shop" 
                    className="max-h-[200px] border rounded-md" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Owner Photo</h3>
                  <img 
                    src={selectedReport.shopOwnerPhoto} 
                    alt="Shop Owner" 
                    className="max-h-[200px] border rounded-md" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Aadhaar Card</h3>
                  <img 
                    src={selectedReport.aadhaarCardPhoto} 
                    alt="Aadhaar Card" 
                    className="max-h-[200px] border rounded-md" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">PAN Card</h3>
                  <img 
                    src={selectedReport.panCardPhoto} 
                    alt="PAN Card" 
                    className="max-h-[200px] border rounded-md" 
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Store Outside</h3>
                  <img 
                    src={selectedReport.storeOutsidePhoto} 
                    alt="Store Outside" 
                    className="max-h-[200px] border rounded-md" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created On</h3>
                  <p>{format(new Date(selectedReport.createdAt), "MMM dd, yyyy HH:mm")}</p>
                </div>
                {selectedReport.status === VERIFICATION_STATUSES.APPROVED && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Approved On</h3>
                    <p>{selectedReport.approvedAt ? format(new Date(selectedReport.approvedAt), "MMM dd, yyyy HH:mm") : "N/A"}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Verification Reports</DialogTitle>
            <DialogDescription>
              Apply filters to find specific verification reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Date Range</h3>
              <div className="flex space-x-2">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal w-[200px]",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
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
                  <Label htmlFor="endDate">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="endDate"
                        variant={"outline"}
                        className={cn(
                          "justify-start text-left font-normal w-[200px]",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        disabled={!startDate ? {
                          before: new Date(),
                        } : {
                          before: startDate,
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={undefined as any}>All Statuses</SelectItem>
                  <SelectItem value={VERIFICATION_STATUSES.PENDING}>Pending</SelectItem>
                  <SelectItem value={VERIFICATION_STATUSES.APPROVED}>Approved</SelectItem>
                  <SelectItem value={VERIFICATION_STATUSES.REJECTED}>Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, mobile, etc."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
              setStatusFilter(undefined);
              setSearchQuery("");
              refetch();
              setIsFilterOpen(false);
            }}>
              Reset
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}