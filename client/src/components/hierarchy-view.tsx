import { useState } from "react";
import { Employee, USER_ROLES } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildHierarchy } from "@/lib/employee-utils";
import { getInitials, getAvatarColorByRole } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface HierarchyViewProps {
  employees: Employee[];
}

export default function HierarchyView({ employees }: HierarchyViewProps) {
  const { user } = useAuth();

  // Determine user roles
  const isAdmin = user?.userType === USER_ROLES.ADMIN;
  const isManager = user?.userType === USER_ROLES.MANAGER;
  const isBDM = user?.userType === USER_ROLES.BDM;
  const isBDE = user?.userType === USER_ROLES.BDE;
  
  // Filter the employees based on role before building hierarchy
  let filteredEmployees = employees;
  
  if (!isAdmin) {
    if (isManager && user) {
      // Managers only see themselves and employees under them
      filteredEmployees = employees.filter(emp => 
        emp.id === user.id || // Self
        emp.managerId === user.id || // Direct reports (BDMs)
        (emp.userType === USER_ROLES.BDE && // BDEs under their BDMs
          employees.some(bdm => bdm.id === emp.bdmId && bdm.managerId === user.id))
      );
    } else if (isBDM && user) {
      // BDMs see themselves, their manager, and BDEs under them
      filteredEmployees = employees.filter(emp => 
        emp.id === user.id || // Self
        (user.managerId && emp.id === user.managerId) || // Their manager
        (emp.userType === USER_ROLES.BDE && emp.bdmId === user.id) // Their BDEs
      );
    } else if (isBDE && user) {
      // BDEs see themselves, their BDM, and their manager
      filteredEmployees = employees.filter(emp => 
        emp.id === user.id || // Self
        (user.bdmId && emp.id === user.bdmId) || // Their BDM
        (user.managerId && emp.id === user.managerId) // Their manager
      );
    }
  }
  
  // Build hierarchy structure from filtered employees
  const hierarchyData = buildHierarchy(filteredEmployees);
  
  // Pre-expand nodes based on the user's role
  const initialExpandedManagers: { [key: number]: boolean } = {};
  const initialExpandedBDMs: { [key: number]: boolean } = {};
  
  // If user is a manager, expand their own node
  if (isManager && user) {
    initialExpandedManagers[user.id] = true;
  }
  // If user is a BDM, expand their manager's node and their own node
  else if (isBDM && user && user.managerId) {
    initialExpandedManagers[user.managerId] = true;
    initialExpandedBDMs[user.id] = true;
  }
  // If user is a BDE, expand their manager's node and their BDM's node
  else if (isBDE && user && user.managerId && user.bdmId) {
    initialExpandedManagers[user.managerId] = true;
    initialExpandedBDMs[user.bdmId] = true;
  }
  
  // Store expanded/collapsed state for each manager and BDM
  const [expandedManagers, setExpandedManagers] = useState<{ [key: number]: boolean }>(initialExpandedManagers);
  const [expandedBDMs, setExpandedBDMs] = useState<{ [key: number]: boolean }>(initialExpandedBDMs);
  
  // Toggle expanded state for manager
  const toggleManager = (managerId: number) => {
    setExpandedManagers(prev => ({
      ...prev,
      [managerId]: !prev[managerId]
    }));
  };
  
  // Toggle expanded state for BDM
  const toggleBDM = (bdmId: number) => {
    setExpandedBDMs(prev => ({
      ...prev,
      [bdmId]: !prev[bdmId]
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Organizational Hierarchy</h3>
      
      <div className="space-y-6">
        {hierarchyData.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No hierarchy data available. Create managers to start building your organization structure.
          </p>
        ) : (
          hierarchyData.map(manager => (
            <div key={manager.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Manager */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Avatar className={getAvatarColorByRole(USER_ROLES.MANAGER)}>
                    <AvatarFallback>{getInitials(manager.name)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <h4 className="text-base font-semibold text-gray-900">{manager.name}</h4>
                    <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                      Manager
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">ID: {manager.employeeId}</span>
                  <button 
                    onClick={() => toggleManager(manager.id)} 
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {expandedManagers[manager.id] ? 
                      <ChevronDown className="h-5 w-5" /> : 
                      <ChevronRight className="h-5 w-5" />
                    }
                  </button>
                </div>
              </div>
              
              {/* BDMs under this Manager */}
              <div className={cn(
                "ml-10 pl-6 border-l-2 border-indigo-200 space-y-4",
                !expandedManagers[manager.id] && "hidden"
              )}>
                {manager.bdms && manager.bdms.length > 0 ? (
                  manager.bdms.map(bdm => (
                    <div key={bdm.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                      {/* BDM */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Avatar className={getAvatarColorByRole(USER_ROLES.BDM)}>
                            <AvatarFallback>{getInitials(bdm.name)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <h5 className="text-sm font-semibold text-gray-900">{bdm.name}</h5>
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              BDM
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">ID: {bdm.employeeId}</span>
                          <button 
                            onClick={() => toggleBDM(bdm.id)} 
                            className="text-green-600 hover:text-green-900"
                          >
                            {expandedBDMs[bdm.id] ? 
                              <ChevronDown className="h-5 w-5" /> : 
                              <ChevronRight className="h-5 w-5" />
                            }
                          </button>
                        </div>
                      </div>
                      
                      {/* BDEs under this BDM */}
                      <div className={cn(
                        "ml-8 pl-4 border-l-2 border-green-200 space-y-3",
                        !expandedBDMs[bdm.id] && "hidden"
                      )}>
                        {bdm.bdes && bdm.bdes.length > 0 ? (
                          bdm.bdes.map(bde => (
                            <div key={bde.id} className="border border-gray-100 rounded-lg p-2 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Avatar className={getAvatarColorByRole(USER_ROLES.BDE)}>
                                    <AvatarFallback>{getInitials(bde.name)}</AvatarFallback>
                                  </Avatar>
                                  <div className="ml-3">
                                    <h6 className="text-sm font-medium text-gray-900">{bde.name}</h6>
                                    <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                      BDE
                                    </Badge>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500">ID: {bde.employeeId}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 italic py-2">
                            No BDEs assigned to this BDM yet.
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 italic py-2">
                    No BDMs assigned to this manager yet.
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
