import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Employee, USER_ROLES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck } from "lucide-react";
import { getInitials, getAvatarColorByRole, getShortRoleName } from "@/lib/utils";
import { getManagerName, getBDMName, filterEmployees } from "@/lib/employee-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ManageAssignmentsProps {
  employees: Employee[];
}

export default function ManageAssignments({ employees }: ManageAssignmentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"assign" | "remove">("assign");
  const [employeeToUpdate, setEmployeeToUpdate] = useState<Employee | null>(null);

  // Check if user has admin permissions
  const isAdmin = user?.userType === USER_ROLES.ADMIN;

  // Filter employees for selection
  const assignableEmployees = employees.filter(emp => 
    emp.userType === USER_ROLES.BDM || emp.userType === USER_ROLES.BDE
  );

  // Filter potential supervisors (managers for BDMs, BDMs for BDEs)
  const getPotentialSupervisors = () => {
    const selectedEmp = employees.find(emp => emp.id.toString() === selectedEmployee);
    
    if (!selectedEmp) return [];
    
    if (selectedEmp.userType === USER_ROLES.BDM) {
      return employees.filter(emp => emp.userType === USER_ROLES.MANAGER);
    } else if (selectedEmp.userType === USER_ROLES.BDE) {
      // If a BDE already has a manager assigned, only show BDMs under that manager
      if (selectedEmp.managerId) {
        return employees.filter(emp => 
          emp.userType === USER_ROLES.BDM && emp.managerId === selectedEmp.managerId
        );
      }
      // Otherwise show all BDMs
      return employees.filter(emp => emp.userType === USER_ROLES.BDM);
    }
    
    return [];
  };

  // Filter displayed employees based on search and role
  const filteredEmployees = employees
    .filter(emp => emp.userType !== USER_ROLES.ADMIN)
    .filter(emp => {
      if (roleFilter === "all") return true;
      return emp.userType === roleFilter;
    })
    .filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Assign employee mutation
  const assignMutation = useMutation({
    mutationFn: async ({ employeeId, supervisorId, supervisorType }: { 
      employeeId: number; 
      supervisorId: number;
      supervisorType: string;
    }) => {
      if (supervisorType === USER_ROLES.MANAGER) {
        return apiRequest("POST", `/api/employees/${employeeId}/assign-manager/${supervisorId}`);
      } else if (supervisorType === USER_ROLES.BDM) {
        return apiRequest("POST", `/api/employees/${employeeId}/assign-bdm/${supervisorId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Assignment successful",
        description: "Employee has been reassigned successfully",
      });
      setSelectedEmployee("");
      setSelectedSupervisor("");
      setConfirmDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment failed",
        description: error.message || "Failed to assign employee",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
    },
  });

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      return apiRequest("POST", `/api/employees/${employeeId}/remove-assignment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Assignment removed",
        description: "Employee's assignments have been removed successfully",
      });
      setConfirmDialogOpen(false);
      setEmployeeToUpdate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove assignment",
        description: error.message || "An error occurred while removing the assignment",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
    },
  });

  const handleAssignmentSubmit = () => {
    if (!selectedEmployee || !selectedSupervisor) {
      toast({
        title: "Validation error",
        description: "Please select both an employee and a supervisor",
        variant: "destructive",
      });
      return;
    }

    const employeeToAssign = employees.find(emp => emp.id.toString() === selectedEmployee);
    const supervisor = employees.find(sup => sup.id.toString() === selectedSupervisor);

    if (!employeeToAssign || !supervisor) {
      toast({
        title: "Error",
        description: "Selected employee or supervisor not found",
        variant: "destructive",
      });
      return;
    }

    setEmployeeToUpdate(employeeToAssign);
    setActionType("assign");
    setConfirmDialogOpen(true);
  };

  const handleRemoveAssignment = (employee: Employee) => {
    setEmployeeToUpdate(employee);
    setActionType("remove");
    setConfirmDialogOpen(true);
  };

  const confirmAction = () => {
    if (!employeeToUpdate) return;

    if (actionType === "assign") {
      const supervisorId = parseInt(selectedSupervisor);
      const supervisor = employees.find(sup => sup.id === supervisorId);
      
      if (!supervisor) return;

      assignMutation.mutate({
        employeeId: employeeToUpdate.id,
        supervisorId,
        supervisorType: supervisor.userType,
      });
    } else if (actionType === "remove") {
      removeAssignmentMutation.mutate(employeeToUpdate.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Reassign Employee</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Select Employee to Reassign */}
          <div>
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choose an employee</SelectItem>
                
                {assignableEmployees.length > 0 && (
                  <>
                    <SelectItem value="bdm-header" disabled className="font-semibold">
                      Business Development Managers
                    </SelectItem>
                    {assignableEmployees
                      .filter(emp => emp.userType === USER_ROLES.BDM)
                      .map(bdm => (
                        <SelectItem key={bdm.id} value={bdm.id.toString()}>
                          {bdm.name} ({bdm.employeeId})
                        </SelectItem>
                      ))}
                      
                    <SelectItem value="bde-header" disabled className="font-semibold mt-2">
                      Business Development Executives
                    </SelectItem>
                    {assignableEmployees
                      .filter(emp => emp.userType === USER_ROLES.BDE)
                      .map(bde => (
                        <SelectItem key={bde.id} value={bde.id.toString()}>
                          {bde.name} ({bde.employeeId})
                        </SelectItem>
                      ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Select New Supervisor */}
          <div>
            <label htmlFor="new-supervisor" className="block text-sm font-medium text-gray-700 mb-2">
              New Supervisor
            </label>
            <Select
              value={selectedSupervisor}
              onValueChange={setSelectedSupervisor}
              disabled={!selectedEmployee || !isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choose a supervisor</SelectItem>
                
                {getPotentialSupervisors().length > 0 && (
                  <>
                    {getPotentialSupervisors()[0]?.userType === USER_ROLES.MANAGER && (
                      <SelectItem value="managers-header" disabled className="font-semibold">
                        Managers
                      </SelectItem>
                    )}
                    
                    {getPotentialSupervisors()[0]?.userType === USER_ROLES.BDM && (
                      <SelectItem value="bdm-header2" disabled className="font-semibold">
                        Business Development Managers
                      </SelectItem>
                    )}
                    
                    {getPotentialSupervisors().map(supervisor => (
                      <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                        {supervisor.name} ({supervisor.employeeId})
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Action Button */}
          <div className="flex items-end">
            <Button 
              onClick={handleAssignmentSubmit}
              disabled={!selectedEmployee || !selectedSupervisor || !isAdmin}
              className="w-full"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Reassign Employee
            </Button>
          </div>
        </div>
      </div>
      
      {/* Current Assignments */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Current Assignments</h3>
          <div className="flex space-x-4">
            <div className="relative w-64">
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by Role" />
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
        <div className="border-t border-gray-200">
          {filteredEmployees.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500">
              No employees found matching your search criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Reports To</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employeeId}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className={`h-8 w-8 mr-2 ${getAvatarColorByRole(employee.userType)}`}>
                            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                          </Avatar>
                          {employee.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          employee.userType === USER_ROLES.MANAGER 
                            ? "bg-indigo-100 text-indigo-800"
                            : employee.userType === USER_ROLES.BDM
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                        }>
                          {getShortRoleName(employee.userType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.userType === USER_ROLES.MANAGER
                          ? "None"
                          : employee.userType === USER_ROLES.BDM
                            ? getManagerName(employee, employees)
                            : employee.bdmId
                              ? `${getBDMName(employee, employees)} (BDM)`
                              : employee.managerId
                                ? `${getManagerName(employee, employees)} (Manager)`
                                : "None"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {employee.userType !== USER_ROLES.MANAGER && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(employee.id.toString());
                                  setSelectedSupervisor("none");
                                }}
                              >
                                Reassign
                              </Button>
                              {(employee.managerId || employee.bdmId) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                  onClick={() => handleRemoveAssignment(employee)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "assign" ? "Confirm Reassignment" : "Confirm Removal"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "assign" ? (
                <>
                  Are you sure you want to reassign <strong>{employeeToUpdate?.name}</strong> to 
                  <strong> {employees.find(emp => emp.id.toString() === selectedSupervisor)?.name}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to remove all assignments from <strong>{employeeToUpdate?.name}</strong>?
                  This will remove them from their current supervisor.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionType === "assign" ? "Reassign" : "Remove Assignment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
