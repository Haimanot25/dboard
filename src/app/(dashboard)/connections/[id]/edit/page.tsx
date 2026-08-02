"use client";

import { useRouter } from "next/navigation";
import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { useConnection, useUpdateConnection } from "@/hooks/use-connections";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function EditConnectionPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: connection, isLoading } = useConnection(params.id);
  const updateMutation = useUpdateConnection();

  const handleSubmit = async (data: Record<string, unknown>) => {
    await updateMutation.mutateAsync({ id: params.id, ...data });
    router.push("/connections");
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Edit Connection"
          description="Loading connection details..."
          icon={<Settings className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Connections", href: "/connections" },
            { label: "Edit Connection" },
          ]}
        />
        <div className="max-w-2xl">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Edit Connection"
          description="Connection not found"
          icon={<Settings className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Connections", href: "/connections" },
            { label: "Edit Connection" },
          ]}
        />
        <div className="max-w-2xl">
          <Card className="border-destructive/30">
            <CardContent className="pt-6 text-destructive text-sm">
              Connection not found.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit ${connection.name}`}
        description="Update your database connection details"
        icon={<Settings className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Connections", href: "/connections" },
          { label: connection.name, href: `/connections/${params.id}/schema` },
          { label: "Edit" },
        ]}
      />
      <div className="max-w-2xl">
        <ConnectionForm
          initialData={connection}
          onSubmit={handleSubmit}
          mode="edit"
        />
      </div>
    </div>
  );
}
