import { Employee, USER_ROLES } from "@shared/schema";
import { User, GitBranch, UserRound, Users } from "lucide-react";

interface DashboardCardsProps {
  employees: Employee[];
}

export default function DashboardCards({ employees }: DashboardCardsProps) {
  // Filter employees by role
  const managers = employees.filter(emp => emp.userType === USER_ROLES.MANAGER);
  const bdms = employees.filter(emp => emp.userType === USER_ROLES.BDM);
  const bdes = employees.filter(emp => emp.userType === USER_ROLES.BDE);
  
  const cards = [
    {
      title: "Total Employees",
      count: employees.length,
      icon: <User className="text-xl text-primary" />,
      bgColor: "bg-primary-100",
    },
    {
      title: "Managers",
      count: managers.length,
      icon: <Users className="text-xl text-indigo-600" />,
      bgColor: "bg-indigo-100",
    },
    {
      title: "BDMs",
      count: bdms.length,
      icon: <GitBranch className="text-xl text-green-600" />,
      bgColor: "bg-green-100",
    },
    {
      title: "BDEs",
      count: bdes.length,
      icon: <UserRound className="text-xl text-amber-600" />,
      bgColor: "bg-amber-100",
    },
  ];

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
