import { DeleteUserButton, PlaceholderDeleteUserButton } from "@/components/delete-user-button";
import { ReturnButton } from "@/components/return-button";
import { UserRoleSelect } from "@/components/user-role-select";
import { UserRole } from "@/generated/prisma";
import { auth } from "@/lib/auth";
//
import { headers } from "next/headers";
import { redirect } from "next/navigation";


export default async function Page() {
  const headersList = await headers();

    const session = await auth.api.getSession({
        headers: headersList
    })

    if(!session) redirect("/auth/login");

    if(session.user.role !== "ADMIN"){

  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/profile" label="Profile" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <p className="p-2 rounded-md text-lg bg-rose-900 text-white font-bold">FORBIDDEN</p>
    </div>
  );}

  //Prisma query to get all users
//  const users = await prisma.user.findMany({
//    orderBy: {
//      name: "asc"
//    },
//  });

const {users} = await auth.api.listUsers({
  headers: headersList,
  query: {
    sortBy: "name"
  }
});

const sortedUsers = users.sort((a, b) => {
  if(a.role === "ADMIN" && b.role !== "ADMIN") return 1; // users at top
  if(a.role !== "ADMIN" && b.role === "ADMIN") return -1; //admins at bottom
  return 0
});


  return (
    <div className="px-8 py-16 container mx-auto max-w-screen-lg space-y-8">
      <div className="space-y-8">
        <ReturnButton href="/profile" label="Profile" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>
      <p className="p-2 rounded-md text-lg bg-emerald-900 text-white font-bold">WELCOME</p>
      <div className="w-full overflow-x-auto">
        <table className="table-auto min-w-full whitespace-nowrap">
            <thead>
                <tr className="border-b text-sm text-left">
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2 text-center">Role</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                </tr>
            </thead>
            <tbody>
                {sortedUsers.map((user) => (
                    <tr key={user.id} className="border-b text-sm text-left">
                    <td className="px-4 py-2">{user.id.slice(0, 8)}</td>
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2 text-center">
                      <UserRoleSelect userId={user.id} role={user.role as UserRole} />
                    </td>
                    <td className="px-4 py-2 text-center">
                        {user.role === "USER" ? (<DeleteUserButton userId={user.id} />): (<PlaceholderDeleteUserButton />) }
                    </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}