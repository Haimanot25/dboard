"use client";

import { useRouter } from "next/navigation";
import { ConnectionForm } from "@/components/connections/ConnectionForm";
import { useCreateConnection } from "@/hooks/use-connections";
import { PageHeader } from "@/components/shared/PageHeader";
import { Plus } from "lucide-react";

export default function NewConnectionPage() {
  const router = useRouter();
  const createMutation = useCreateConnection();

  const handleSubmit = async (data: Record<string, unknown>) => {
    await createMutation.mutateAsync(data);
    router.push("/connections");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Connection"
        description="Add a new database connection"
        icon={<Plus className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Connections", href: "/connections" },
          { label: "New Connection" },
        ]}
      />
      <div className="max-w-2xl">
        <ConnectionForm onSubmit={handleSubmit} mode="create" />
      </div>
    </div>
  );
}
