import { SignOutButton } from "@/components/sign-out-button";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DeactivatedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <CardTitle className="mt-4 text-2xl font-bold">
            Account Deactivated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-600">
            Your account has been deactivated by an administrator. You no longer have
            access to the dashboard. Please contact support for further information.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}