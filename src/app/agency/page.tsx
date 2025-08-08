// src/app/agency/page.tsx
"use client";

import { PageHeader } from "@/components/agency-page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock data for the pending tasks table
const pendingTasks = [
  {
    id: 1,
    taskName: "Monthly Compliance Declaration",
    dueDate: "2025-08-31",
    status: "Pending",
    href: "/agency/monthly-compliance-declaration",
  },
  {
    id: 2,
    taskName: "Agency Manpower Register Update",
    dueDate: "2025-09-05",
    status: "Pending",
    href: "/agency/manpower-register",
  },
  {
    id: 3,
    taskName: "Code Of Conduct Acknowledgement",
    dueDate: "2025-08-15",
    status: "Overdue",
    href: "/agency/code-of-conduct",
  },
    {
    id: 4,
    taskName: "Submit Payment Register",
    dueDate: "2025-09-01",
    status: "Pending",
    href: "/agency/payment-register",
  },
];

export default function AgencyDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <PageHeader returnHref="/profile" returnLabel="Back to Profile" />

      <main className="p-8">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              Agency Dashboard
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              Welcome! Here are your pending tasks and quick actions.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                Pending Tasks
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Task Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {task.taskName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.dueDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.status === "Overdue"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button asChild variant="link" className="text-rose-600 p-0 h-auto">
                            <Link href={task.href}>
                                View Task
                            </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}