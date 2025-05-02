import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

export default function UnauthorizedPage() {
  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] py-16">
        <AlertTriangle className="h-16 w-16 text-warning mb-6" />
        <h1 className="text-4xl font-bold tracking-tight mb-4">Unauthorized Access</h1>
        <p className="text-xl text-muted-foreground text-center max-w-md mb-8">
          You don't have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <Button variant="default" size="lg">
              Go to Homepage
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg">
              Contact Support
            </Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
