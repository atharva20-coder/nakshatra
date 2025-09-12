"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getAllSubmissionsForAdmin } from "@/actions/form-management.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORM_CONFIGS, FormType } from "@/types/forms";
import { UserRole } from "@/generated/prisma";

// --- Type definitions ---
interface Submission {
  id: string;
  status: string;
  updatedAt: Date;
  formType: string;
  user: { id: string; name: string };
}

interface User {
    id: string;
    name: string;
}

export default function AdminFormsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = useSession();

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedFormType, setSelectedFormType] = useState<string>("all");

  useEffect(() => {
    if (isSessionPending) return;

    if (!session || session.user.role !== UserRole.ADMIN) {
        router.push("/profile");
        return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        const result = await getAllSubmissionsForAdmin();
        if (result.error) {
            setError(result.error);
        } else {
            setAllSubmissions(result.submissions || []);
            setUsers(result.users || []);
        }
        setIsLoading(false);
    };

    fetchData();
  }, [session, isSessionPending, router]);

  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter((sub) => {
      const userMatch = selectedUserId === "all" || sub.user.id === selectedUserId;
      const formMatch = selectedFormType === "all" || sub.formType === selectedFormType;
      return userMatch && formMatch;
    });
  }, [allSubmissions, selectedUserId, selectedFormType]);

  if (isSessionPending || isLoading) {
      return <div className="container mx-auto p-8">Loading...</div>;
  }

  if (error) {
      return <div className="container mx-auto p-8">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">Admin - All Form Submissions</h1>
      <div className="space-y-6">
        <div className="flex gap-4">
          {/* User Filter Dropdown */}
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Form Type Filter Dropdown */}
          <Select value={selectedFormType} onValueChange={setSelectedFormType}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by Form Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Form Types</SelectItem>
              {Object.keys(FORM_CONFIGS).map((formType) => (
                <SelectItem key={formType} value={formType}>
                  {FORM_CONFIGS[formType as FormType].title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubmissions.map((form) => (
                <tr key={form.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link href={`/admin/users/${form.user.id}`} className="text-rose-600 hover:text-rose-900 hover:underline">
                      {form.user.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {FORM_CONFIGS[form.formType as FormType]?.title || form.formType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${form.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {form.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(form.updatedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/forms/${form.formType}/${form.id}`} className="text-rose-600 hover:text-rose-900">
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSubmissions.length === 0 && (
            <p className="text-center text-gray-500 py-8">No matching submissions found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

