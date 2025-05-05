import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function EmployeeDocumentViewer() {
  const { user } = useAuth();

  // Query for fetching employee documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/employee-documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest(`/api/employee-documents/${user.id}`);
      return response as EmployeeDocument[];
    },
    enabled: !!user,
  });

  // Filter documents by type
  const payslips = documents?.filter((doc: EmployeeDocument) => doc.documentType === DOCUMENT_TYPES.PAYSLIP) || [];
  const offerLetter = documents?.find((doc: EmployeeDocument) => doc.documentType === DOCUMENT_TYPES.OFFER_LETTER);

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">My Documents</h3>

      <Tabs defaultValue="payslips">
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="offer-letter">Offer Letter</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payslips</CardTitle>
              <CardDescription>Your monthly salary statements</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <p>Loading payslips...</p>
                </div>
              ) : payslips.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Uploaded On</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((doc: EmployeeDocument) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.month}</TableCell>
                        <TableCell>{format(new Date(doc.uploadedAt), "PP")}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.documentUrl, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <FileText className="h-10 w-10 text-gray-400 mb-2" />
                  <p>No payslips have been uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offer-letter" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Offer Letter</CardTitle>
              <CardDescription>Your employment offer letter</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <p>Loading offer letter...</p>
                </div>
              ) : offerLetter ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border p-4 rounded-md">
                    <div>
                      <p className="font-medium">Offer Letter</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded on {format(new Date(offerLetter.uploadedAt), "PPP")}
                      </p>
                    </div>
                    <Button
                      variant="default"
                      onClick={() => window.open(offerLetter.documentUrl, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      View Document
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <FileText className="h-10 w-10 text-gray-400 mb-2" />
                  <p>No offer letter has been uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}