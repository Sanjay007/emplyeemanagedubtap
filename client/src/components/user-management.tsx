import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Employee, USER_ROLES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Edit, Trash, UserPlus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { filterEmployees, filterEmployeesByRole, getManagerName } from "@/lib/employee-utils";
import EmployeeForm from "@/components/employee-form";
import { getInitials, getAvatarColorByRole, getRoleName, getShortRoleName } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";

interface UserManagementProps {
  employees: Employee[];
}

export default function UserManagement({ employees }: UserManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Check if user is admin
  const isAdmin = user?.userType === USER_ROLES.ADMIN;
  const isManager = user?.userType === USER_ROLES.MANAGER;
  const isBDM = user?.userType === USER_ROLES.BDM;
  
  // First, filter employees based on role access
  const roleFilteredEmployees = employees.filter(employee => {
    // Admin can see all employees
    if (isAdmin) return true;
    
    // Manager can only see BDMs and BDEs under them, not admin users
    if (isManager && user) {
      return (
        // Don't show admin users
        employee.userType !== USER_ROLES.ADMIN &&
        // Only show users that are under this manager
        (
          // Show BDMs that report to this manager
          (employee.userType === USER_ROLES.BDM && employee.managerId === user.id) || 
          // Show BDEs that report to this manager directly or through a BDM
          (employee.userType === USER_ROLES.BDE && (
            employee.managerId === user.id || 
            (employee.bdmId && employees.some(bdm => bdm.id === employee.bdmId && bdm.managerId === user.id))
          )) ||
          // Show the manager themselves
          employee.id === user.id
        )
      );
    }
    
    // BDM can see their manager and BDEs under them
    if (isBDM && user) {
      return (
        // Show BDEs that report to this BDM
        (employee.userType === USER_ROLES.BDE && employee.bdmId === user.id) ||
        // Show the BDM themselves
        employee.id === user.id ||
        // Show the manager of this BDM
        (employee.userType === USER_ROLES.MANAGER && employee.id === user.managerId)
      );
    }
    
    // BDEs can see their manager and BDM
    if (user?.userType === USER_ROLES.BDE) {
      return (
        // Show themselves
        employee.id === user.id ||
        // Show their BDM (if they have one)
        (user.bdmId && employee.id === user.bdmId) ||
        // Show their manager (if they have one)
        (user.managerId && employee.id === user.managerId)
      );
    }
    
    // Fallback - only show themselves
    return employee.id === user?.id;
  });
  
  // Then filter by search and role filter
  const filteredEmployees = filterEmployeesByRole(
    filterEmployees(roleFilteredEmployees, searchTerm),
    roleFilter
  );

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      await apiRequest("DELETE", `/api/employees/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Employee deleted",
        description: "The employee has been successfully removed.",
      });
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee.",
        variant: "destructive",
      });
      setDeleteConfirmOpen(false);
    },
  });

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (employeeToDelete) {
      deleteMutation.mutate(employeeToDelete.id);
    }
  };

  const handleAddEmployee = () => {
    setFormMode("create");
    setSelectedEmployee(null);
    setShowUserForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setFormMode("edit");
    setSelectedEmployee(employee);
    setShowUserForm(true);
  };

  const handleCloseForm = () => {
    setShowUserForm(false);
    setSelectedEmployee(null);
  };



  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Employee List</h3>
        {isAdmin && (
          <Button onClick={handleAddEmployee}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Employee
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employees..."
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <Select value={roleFilter || "all"} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value={USER_ROLES.MANAGER}>Managers</SelectItem>
              <SelectItem value={USER_ROLES.BDM}>BDMs</SelectItem>
              <SelectItem value={USER_ROLES.BDE}>BDEs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredEmployees.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              No employees found matching your search criteria.
            </li>
          ) : (
            filteredEmployees.map((employee) => (
              <li key={employee.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className={getAvatarColorByRole(employee.userType)}>
                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">
                      {getRoleName(employee.userType)}
                      {employee.managerId && 
                        ` - Reports to ${getManagerName(employee, employees)}`}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge variant="outline" className="bg-primary-50 text-primary-700">
                    {getShortRoleName(employee.userType)}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    ID: {employee.employeeId}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4 text-indigo-600" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(employee)}>
                        <Edit className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(employee)}>
                        <Trash className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Employee Form Modal */}
      <EmployeeForm
        isOpen={showUserForm}
        onClose={handleCloseForm}
        mode={formMode}
        employee={selectedEmployee}
        allEmployees={employees}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the employee 
              {employeeToDelete && <strong> {employeeToDelete.name}</strong>}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
