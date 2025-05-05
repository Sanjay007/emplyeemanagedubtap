import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { USER_ROLES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Employee {
  id: number;
  name: string;
  mobile: string;
  employeeId: string;
  userType: string;
  jobLocation: string;
  managerId: number | null;
  bdmId: number | null;
}

interface VisitReport {
  id: number;
  bdeId: number;
  storeName: string;
  ownerName: string;
  location: string;
  phoneNumber: string;
  photoUrl: string;
  productsInterested: string[];
  createdAt: string;
  updatedAt: string;
}

interface SalesReport {
  id: number;
  bdeId: number;
  merchantName: string;
  merchantMobile: string;
  location: string;
  amount: number;
  transactionId: string;
  paymentMode: string;
  productId: number;
  status: string;
  approvedBy: number | null;
  approvedAt: string | null;
  points: number | null;
  createdAt: string;
  updatedAt: string;
}

interface VerificationReport {
  id: number;
  bdeId: number;
  merchantName: string;
  mobileNumber: string;
  businessName: string;
  fullAddress: string;
  verificationVideo: string;
  shopPhoto: string;
  shopOwnerPhoto: string;
  aadhaarCardPhoto: string;
  panCardPhoto: string;
  storeOutsidePhoto: string;
  status: string;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectedBy: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const BdmBdeView: React.FC<{ currentUser: Employee }> = ({ currentUser }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBde, setSelectedBde] = useState<Employee | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Only load BDEs if the current user is a BDM
  const shouldFetchBdes = currentUser?.userType === USER_ROLES.BDM;

  // Query to get all BDEs assigned to this BDM
  const {
    data: bdes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/employees/bdm", currentUser?.id],
    queryFn: async () => {
      if (!shouldFetchBdes) return [];
      
      // Get BDEs assigned to this BDM
      const response = await apiRequest(`/api/employees/bdm/${currentUser.id}`, {
        method: "GET",
      });
      
      return response || [];
    },
    enabled: shouldFetchBdes && !!currentUser?.id,
  });

  // Get visit reports for a specific BDE
  const {
    data: bdeVisitReports = [],
    isLoading: loadingVisitReports,
  } = useQuery({
    queryKey: ["/api/visit-reports/bde", selectedBde?.id],
    queryFn: async () => {
      if (!selectedBde) return [];
      
      const response = await apiRequest(`/api/visit-reports/bde/${selectedBde.id}`, {
        method: "GET",
      });
      
      return response || [];
    },
    enabled: !!selectedBde?.id,
  });

  // Get sales reports for a specific BDE
  const {
    data: bdeSalesReports = [],
    isLoading: loadingSalesReports,
  } = useQuery({
    queryKey: ["/api/sales-reports/bde", selectedBde?.id],
    queryFn: async () => {
      if (!selectedBde) return [];
      
      const response = await apiRequest(`/api/sales-reports/bde/${selectedBde.id}`, {
        method: "GET",
      });
      
      return response || [];
    },
    enabled: !!selectedBde?.id,
  });

  // Get verification reports for a specific BDE
  const {
    data: bdeVerificationReports = [],
    isLoading: loadingVerificationReports,
  } = useQuery({
    queryKey: ["/api/verification-reports/bde", selectedBde?.id],
    queryFn: async () => {
      if (!selectedBde) return [];
      
      const response = await apiRequest(`/api/verification-reports/bde/${selectedBde.id}`, {
        method: "GET",
      });
      
      return response || [];
    },
    enabled: !!selectedBde?.id,
  });

  const handleViewDetails = (bde: Employee) => {
    setSelectedBde(bde);
    setDetailsOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  if (!shouldFetchBdes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>BDE Management</CardTitle>
          <CardDescription>
            This section is only available for Business Development Managers.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>BDE Management</CardTitle>
          <CardDescription>Loading your team members...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>BDE Management</CardTitle>
          <CardDescription>
            An error occurred while loading your team members.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Business Development Executives</CardTitle>
        <CardDescription>
          Manage and view reports from your team members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {bdes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No BDEs assigned to you yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bdes.map((bde: Employee) => (
                <TableRow key={bde.id}>
                  <TableCell>{bde.employeeId}</TableCell>
                  <TableCell className="font-medium">{bde.name}</TableCell>
                  <TableCell>{bde.mobile}</TableCell>
                  <TableCell>{bde.jobLocation}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(bde)}
                    >
                      View Reports
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* BDE Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {selectedBde?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedBde?.name}'s Reports</span>
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              {/* Visit Reports Section */}
              <div>
                <h3 className="text-lg font-semibold">Visit Reports</h3>
                <Separator className="my-2" />
                {loadingVisitReports ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : bdeVisitReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No visit reports found.
                  </p>
                ) : (
                  <ScrollArea className="h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store Name</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bdeVisitReports.map((report: VisitReport) => (
                          <TableRow key={report.id}>
                            <TableCell>{report.storeName}</TableCell>
                            <TableCell>{report.ownerName}</TableCell>
                            <TableCell>{report.location}</TableCell>
                            <TableCell>
                              {formatDate(report.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>

              {/* Sales Reports Section */}
              <div>
                <h3 className="text-lg font-semibold">Sales Reports</h3>
                <Separator className="my-2" />
                {loadingSalesReports ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : bdeSalesReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No sales reports found.
                  </p>
                ) : (
                  <ScrollArea className="h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bdeSalesReports.map((report: SalesReport) => (
                          <TableRow key={report.id}>
                            <TableCell>{report.merchantName}</TableCell>
                            <TableCell>₹{report.amount}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  report.status === "pending"
                                    ? "outline"
                                    : "default"
                                }
                              >
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(report.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>

              {/* Verification Reports Section */}
              <div>
                <h3 className="text-lg font-semibold">Verification Reports</h3>
                <Separator className="my-2" />
                {loadingVerificationReports ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : bdeVerificationReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No verification reports found.
                  </p>
                ) : (
                  <ScrollArea className="h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Merchant</TableHead>
                          <TableHead>Business</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bdeVerificationReports.map((report: VerificationReport) => (
                          <TableRow key={report.id}>
                            <TableCell>{report.merchantName}</TableCell>
                            <TableCell>{report.businessName}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  report.status === "pending"
                                    ? "outline"
                                    : report.status === "approved"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(report.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BdmBdeView;