import { Employee, USER_ROLES } from "@shared/schema";
import { User, GitBranch, UserRound, Users } from "lucide-react";

interface DashboardCardsProps {
  employees: Employee[];
  currentUser?: Employee;
}

export default function DashboardCards({ employees, currentUser }: DashboardCardsProps) {
  // Use the provided current user
  
  // Filter employees by role - filter based on hierarchy
  const allManagers = employees.filter(emp => emp.userType === USER_ROLES.MANAGER);
  const allBdms = employees.filter(emp => emp.userType === USER_ROLES.BDM);
  const allBdes = employees.filter(emp => emp.userType === USER_ROLES.BDE);
  
  // For Manager: Show only BDMs under them and BDEs under those BDMs
  const bdmsUnderManager = currentUser?.userType === USER_ROLES.MANAGER 
    ? allBdms.filter(bdm => bdm.managerId === currentUser.id)
    : allBdms;
  
  // For Manager or BDM: Show only BDEs under the appropriate BDMs
  let bdesFiltered = allBdes;
  if (currentUser?.userType === USER_ROLES.MANAGER) {
    // Get BDEs under BDMs who report to this manager
    const bdmIds = bdmsUnderManager.map(bdm => bdm.id);
    bdesFiltered = allBdes.filter(bde => bdmIds.includes(bde.bdmId || -1));
  } else if (currentUser?.userType === USER_ROLES.BDM) {
    // Get BDEs who directly report to this BDM
    bdesFiltered = allBdes.filter(bde => bde.bdmId === currentUser.id);
  }
  
  // Customize cards based on user role
  let cards = [];
  
  if (currentUser?.userType === USER_ROLES.ADMIN) {
    // Admin sees all counts
    cards = [
      {
        title: "Total Employees",
        count: employees.length,
        icon: <User className="text-xl text-primary" />,
        bgColor: "bg-primary-100",
      },
      {
        title: "Managers",
        count: allManagers.length,
        icon: <Users className="text-xl text-indigo-600" />,
        bgColor: "bg-indigo-100",
      },
      {
        title: "BDMs",
        count: allBdms.length,
        icon: <GitBranch className="text-xl text-green-600" />,
        bgColor: "bg-green-100",
      },
      {
        title: "BDEs",
        count: allBdes.length,
        icon: <UserRound className="text-xl text-amber-600" />,
        bgColor: "bg-amber-100",
      },
    ];
  } else if (currentUser?.userType === USER_ROLES.MANAGER) {
    // Manager sees BDMs under them and BDEs under those BDMs
    cards = [
      {
        title: "BDMs",
        count: bdmsUnderManager.length,
        icon: <GitBranch className="text-xl text-green-600" />,
        bgColor: "bg-green-100",
      },
      {
        title: "BDEs",
        count: bdesFiltered.length,
        icon: <UserRound className="text-xl text-amber-600" />,
        bgColor: "bg-amber-100",
      },
    ];
  } else if (currentUser?.userType === USER_ROLES.BDM) {
    // BDM sees only BDEs under them
    cards = [
      {
        title: "BDEs",
        count: bdesFiltered.length,
        icon: <UserRound className="text-xl text-amber-600" />,
        bgColor: "bg-amber-100",
      },
    ];
  } else {
    // Default (BDE or no user) - just show total employees
    cards = [
      {
        title: "Total Employees",
        count: employees.length,
        icon: <User className="text-xl text-primary" />,
        bgColor: "bg-primary-100",
      },
    ];
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${card.bgColor} rounded-md p-3`}>
                  {card.icon}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500">{card.title}</dt>
                    <dd>
                      <div className="text-lg font-semibold text-gray-900">{card.count}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
