"use client";

import { useParams } from "next/navigation";
import { useConnection } from "@/hooks/use-connections";
import { SqlConsole } from "@/components/query/SqlConsole";
import { PageHeader } from "@/components/shared/PageHeader";
import { Terminal } from "lucide-react";

export default function QueryPage() {
  const params = useParams<{ id: string }>();
  const connectionId = params.id;
  const { data: connection } = useConnection(connectionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SQL Console"
        description={connection ? `Running queries on ${connection.name}` : "Execute SQL queries"}
        icon={<Terminal className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Connections", href: "/connections" },
          { label: connection?.name || "Loading...", href: `/connections/${connectionId}/schema` },
          { label: "SQL Console" },
        ]}
      />
      <SqlConsole connectionId={connectionId} />
    </div>
  );
}
