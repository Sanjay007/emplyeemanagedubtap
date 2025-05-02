import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import UserManagement from "@/components/user-management";
import HierarchyView from "@/components/hierarchy-view";
import ManageAssignments from "@/components/manage-assignments";
import AttendanceManagement from "@/components/attendance-management";
import VisitReports from "@/components/visit-reports";
import ProductManagement from "@/components/product-management";
import SalesReports from "@/components/sales-reports";
import VerificationReports from "@/components/verification-reports";
import AdminVerificationManagement from "@/components/admin-verification-management";
import EmployeeDocuments from "@/components/employee-documents";
import DashboardCards from "@/components/dashboard-cards";
import { Loader2 } from "lucide-react";
import { Employee, USER_ROLES } from "@shared/schema";

type TabType = 
  | "userManagement" 
  | "hierarchy" 
  | "assignments" 
  | "attendance" 
  | "visitReports" 
  | "products" 
  | "salesReports"
  | "verificationReports"
  | "verificationManagement"
  | "documents";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("userManagement");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [location] = useLocation();

  // Fetch all employees
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Set the active tab based on the URL
  useEffect(() => {
    // Map URL paths to tab types
    const pathToTabMap: Record<string, TabType> = {
      '/': 'userManagement',
      '/user-management': 'userManagement',
      '/hierarchy': 'hierarchy',
      '/assignments': 'assignments',
      '/attendance': 'attendance',
      '/visit-reports': 'visitReports',
      '/sales-reports': 'salesReports',
      '/products': 'products',
      '/verification-reports': 'verificationReports',
      '/verification-management': 'verificationManagement',
      '/documents': 'documents'
    };

    // Set the active tab based on the current location
    if (pathToTabMap[location]) {
      setActiveTab(pathToTabMap[location]);
    }
  }, [location]);
  
  if (!user) {
    return null; // This should be handled by ProtectedRoute already
  }
  
  // Reset to a valid tab if current tab is not accessible to the user
  if (activeTab === "assignments" && user.userType !== USER_ROLES.ADMIN) {
    setActiveTab("userManagement");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Dashboard Overview */}
              <DashboardCards employees={employees || []} currentUser={user} />

              {/* Tab Navigation */}
              <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6">
                  <button
                    onClick={() => setActiveTab("userManagement")}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "userManagement"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    User Management
                  </button>
                  <button
                    onClick={() => setActiveTab("hierarchy")}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "hierarchy"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Hierarchy View
                  </button>
                  {/* Only show assignments tab to admin users */}
                  {user?.userType === USER_ROLES.ADMIN && (
                    <button
                      onClick={() => setActiveTab("assignments")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "assignments"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Manage Assignments
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("attendance")}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "attendance"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Attendance
                  </button>
                  <button
                    onClick={() => setActiveTab("visitReports")}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "visitReports"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Visit Reports
                  </button>
                  <button
                    onClick={() => setActiveTab("salesReports")}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "salesReports"
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Sales Reports
                  </button>
                  {/* Only show product management tab to admin users */}
                  {user?.userType === USER_ROLES.ADMIN && (
                    <button
                      onClick={() => setActiveTab("products")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "products"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Products
                    </button>
                  )}
                  {/* Only show verification reports tab to BDE users */}
                  {user?.userType === USER_ROLES.BDE && (
                    <button
                      onClick={() => setActiveTab("verificationReports")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "verificationReports"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Verification
                    </button>
                  )}
                  {/* Only show verification management tab to admin users */}
                  {user?.userType === USER_ROLES.ADMIN && (
                    <button
                      onClick={() => setActiveTab("verificationManagement")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "verificationManagement"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Verification Management
                    </button>
                  )}
                  
                  {/* Only show documents management tab to admin users */}
                  {user?.userType === USER_ROLES.ADMIN && (
                    <button
                      onClick={() => setActiveTab("documents")}
                      className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === "documents"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Employee Documents
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === "userManagement" && <UserManagement employees={employees || []} />}
              {activeTab === "hierarchy" && <HierarchyView employees={employees || []} />}
              {activeTab === "assignments" && <ManageAssignments employees={employees || []} />}
              {activeTab === "attendance" && <AttendanceManagement employees={employees || []} />}
              {activeTab === "visitReports" && <VisitReports user={user} />}
              {activeTab === "salesReports" && <SalesReports user={user} />}
              {activeTab === "products" && <ProductManagement />}
              {activeTab === "verificationReports" && <VerificationReports user={user} />}
              {activeTab === "verificationManagement" && <AdminVerificationManagement user={user} />}
              {activeTab === "documents" && <EmployeeDocuments />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
