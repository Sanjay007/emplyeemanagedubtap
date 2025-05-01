import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import UserManagement from "@/components/user-management";
import HierarchyView from "@/components/hierarchy-view";
import ManageAssignments from "@/components/manage-assignments";
import DashboardCards from "@/components/dashboard-cards";
import { Loader2 } from "lucide-react";
import { Employee, USER_ROLES } from "@shared/schema";

type TabType = "userManagement" | "hierarchy" | "assignments";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("userManagement");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // Fetch all employees
  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

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
              <DashboardCards employees={employees || []} />

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
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === "userManagement" && <UserManagement employees={employees || []} />}
              {activeTab === "hierarchy" && <HierarchyView employees={employees || []} />}
              {activeTab === "assignments" && <ManageAssignments employees={employees || []} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
