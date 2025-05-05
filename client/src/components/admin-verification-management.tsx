import React, { useState } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  CheckCircle, 
  XCircle, 
  Filter, 
  Eye, 
  Download, 
  FileText 
} from "lucide-react";
import { VERIFICATION_STATUSES, VerificationReport } from "@shared/schema";
import { ExtendedVerificationReport } from "@/types/extended-schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminVerificationManagementProps {
  user: any; // Using 'any' for simplicity, should ideally use the proper Employee type
}

export default function AdminVerificationManagement({ user }: AdminVerificationManagementProps) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExtendedVerificationReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to filter reports by status
  const filterByStatus = (reports: ExtendedVerificationReport[], status: string) => {
    return reports.filter(report => report.status === status);
  };

  // Function to filter reports by search query
  const filterBySearch = (reports: ExtendedVerificationReport[], query: string) => {
    if (!query) return reports;
    
    const lowercaseQuery = query.toLowerCase();
    return reports.filter(report => 
      report.merchantName.toLowerCase().includes(lowercaseQuery) ||
      report.mobileNumber.toLowerCase().includes(lowercaseQuery) ||
      report.businessName.toLowerCase().includes(lowercaseQuery) ||
      report.fullAddress.toLowerCase().includes(lowercaseQuery)
    );
  };

  // Query to fetch all verification reports
  const {
    data: allReports = [] as ExtendedVerificationReport[],
    isLoading,
    refetch
  } = useQuery<ExtendedVerificationReport[]>({
    queryKey: ["/api/verification-reports"],
    queryFn: async () => {
      const res = await fetch("/api/verification-reports");
      if (!res.ok) throw new Error("Failed to fetch verification reports");
      return res.json();
    }
  });

  // Query to fetch pending verification reports
  const {
    data: pendingReports = [] as ExtendedVerificationReport[],
    isLoading: isPendingLoading,
  } = useQuery<ExtendedVerificationReport[]>({
    queryKey: ["/api/verification-reports/pending"],
    queryFn: async () => {
      const res = await fetch("/api/verification-reports/pending");
      if (!res.ok) throw new Error("Failed to fetch pending verification reports");
      return res.json();
    },
    enabled: user.userType === "admin"
  });

  // Mutation to approve a verification report
  const approveVerificationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/verification-reports/${id}/approve`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification approved",
        description: "The verification report has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-reports/pending"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve verification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to reject a verification report
  const rejectVerificationMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest(`/api/verification-reports/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification rejected",
        description: "The verification report has been rejected successfully.",
      });
      setIsRejectModalOpen(false);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/verification-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/verification-reports/pending"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject verification",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // View report details
  function viewReport(report: ExtendedVerificationReport) {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  }

  // Open reject dialog
  function openRejectDialog(report: ExtendedVerificationReport) {
    setSelectedReport(report);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  }

  // Submit rejection
  function submitRejection() {
    if (!selectedReport) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this verification.",
        variant: "destructive",
      });
      return;
    }
    
    rejectVerificationMutation.mutate({
      id: selectedReport.id,
      reason: rejectionReason
    });
  }

  // Get reports based on active tab and search query
  const getFilteredReports = () => {
    let reports = allReports;

    if (activeTab === "pending") {
      reports = filterByStatus(reports, VERIFICATION_STATUSES.PENDING);
    } else if (activeTab === "approved") {
      reports = filterByStatus(reports, VERIFICATION_STATUSES.APPROVED);
    } else if (activeTab === "rejected") {
      reports = filterByStatus(reports, VERIFICATION_STATUSES.REJECTED);
    }

    return filterBySearch(reports, searchQuery);
  };

  const filteredReports = getFilteredReports();
  
  // Count by status
  const pendingCount = allReports.filter((r: ExtendedVerificationReport) => r.status === VERIFICATION_STATUSES.PENDING).length;
  const approvedCount = allReports.filter((r: ExtendedVerificationReport) => r.status === VERIFICATION_STATUSES.APPROVED).length;
  const rejectedCount = allReports.filter((r: ExtendedVerificationReport) => r.status === VERIFICATION_STATUSES.REJECTED).length;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Verification Reports Management</CardTitle>
          <CardDescription>
            Manage merchant verification reports: approve, reject, and view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card className="bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Pending</h3>
                      <p className="text-2xl font-bold">{pendingCount}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Approved</h3>
                      <p className="text-2xl font-bold">{approvedCount}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Rejected</h3>
                      <p className="text-2xl font-bold">{rejectedCount}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="w-full md:w-auto">
                <Input
                  placeholder="Search by name, mobile, etc."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-80"
                />
              </div>
              <div className="flex-none">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Download all filtered reports as JSON (without media)
                    const reportsData = filteredReports.map(report => {
                      const { 
                        verificationVideo, shopPhoto, shopOwnerPhoto,
                        aadhaarCardPhoto, panCardPhoto, storeOutsidePhoto,
                        ...reportWithoutMedia 
                      } = report;
                      return reportWithoutMedia;
                    });
                    
                    const dataStr = "data:text/json;charset=utf-8," + 
                      encodeURIComponent(JSON.stringify(reportsData, null, 2));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", `verification-reports-${activeTab}.json`);
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="pending" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
              <TabsTrigger value="all">All Reports ({allReports.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4">
              {isLoading || isPendingLoading ? (
                <div className="flex justify-center py-10">Loading verification reports...</div>
              ) : (
                <VerificationTable
                  reports={filteredReports}
                  onViewClick={viewReport}
                  onApproveClick={(report) => approveVerificationMutation.mutate(report.id)}
                  onRejectClick={openRejectDialog}
                  showActions={true}
                />
              )}
            </TabsContent>
            
            <TabsContent value="approved" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">Loading verification reports...</div>
              ) : (
                <VerificationTable
                  reports={filteredReports}
                  onViewClick={viewReport}
                  showActions={false}
                />
              )}
            </TabsContent>
            
            <TabsContent value="rejected" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">Loading verification reports...</div>
              ) : (
                <VerificationTable
                  reports={filteredReports}
                  onViewClick={viewReport}
                  showActions={false}
                />
              )}
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-10">Loading verification reports...</div>
              ) : (
                <VerificationTable
                  reports={filteredReports}
                  onViewClick={viewReport}
                  onApproveClick={(report) => {
                    if (report.status === VERIFICATION_STATUSES.PENDING) {
                      approveVerificationMutation.mutate(report.id);
                    }
                  }}
                  onRejectClick={(report) => {
                    if (report.status === VERIFICATION_STATUSES.PENDING) {
                      openRejectDialog(report);
                    }
                  }}
                  showActions={true}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

              {selectedReport.status === VERIFICATION_STATUSES.PENDING && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openRejectDialog(selectedReport)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => approveVerificationMutation.mutate(selectedReport.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Verification Dialog */}
      <AlertDialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Verification</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this verification.
              The BDE will be able to see this reason and resubmit the verification with corrections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              placeholder="Enter the reason for rejection..."
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsRejectModalOpen(false);
              setRejectionReason("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={submitRejection}
              disabled={rejectVerificationMutation.isPending}
            >
              {rejectVerificationMutation.isPending ? "Submitting..." : "Submit Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Table Component
interface VerificationTableProps {
  reports: ExtendedVerificationReport[];
  onViewClick: (report: ExtendedVerificationReport) => void;
  onApproveClick?: (report: ExtendedVerificationReport) => void;
  onRejectClick?: (report: ExtendedVerificationReport) => void;
  showActions: boolean;
}

function VerificationTable({
  reports,
  onViewClick,
  onApproveClick,
  onRejectClick,
  showActions
}: VerificationTableProps) {
  return (
    <Table>
      <TableCaption>
        {reports.length === 0
          ? "No verification reports found."
          : `Showing ${reports.length} verification reports`}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Merchant Name</TableHead>
          <TableHead>Business Name</TableHead>
          <TableHead>Mobile Number</TableHead>
          <TableHead>BDE Name</TableHead>
          <TableHead>BDM Name</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          {reports.some(r => r.status === VERIFICATION_STATUSES.REJECTED) && (
            <TableHead>Rejection Reason</TableHead>
          )}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.length === 0 ? (
          <TableRow>
            <TableCell colSpan={reports.some(r => r.status === VERIFICATION_STATUSES.REJECTED) ? 9 : 8} className="text-center py-6">
              No verification reports found.
            </TableCell>
          </TableRow>
        ) : (
          reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.merchantName}</TableCell>
              <TableCell>{report.businessName}</TableCell>
              <TableCell>{report.mobileNumber}</TableCell>
              <TableCell>{report.bdeInfo ? report.bdeInfo.name : "N/A"}</TableCell>
              <TableCell>{report.bdmInfo ? report.bdmInfo.name : "N/A"}</TableCell>
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
              {reports.some(r => r.status === VERIFICATION_STATUSES.REJECTED) && (
                <TableCell>
                  {report.status === VERIFICATION_STATUSES.REJECTED && report.rejectionReason ? (
                    <span className="text-xs text-red-500">{report.rejectionReason}</span>
                  ) : (
                    <span className="text-xs text-gray-400">N/A</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewClick(report)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {showActions && report.status === VERIFICATION_STATUSES.PENDING && onApproveClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onApproveClick(report)}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {showActions && report.status === VERIFICATION_STATUSES.PENDING && onRejectClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRejectClick(report)}
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}