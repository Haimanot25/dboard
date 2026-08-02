"use client";

import { useParams } from "next/navigation";
import { useConnection } from "@/hooks/use-connections";
import { useIntrospectSchema, useSchemaConfig, useSaveSchemaConfig } from "@/hooks/use-schema";
import { SchemaConfigurator } from "@/components/schema/SchemaConfigurator";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

export default function SchemaPage() {
  const params = useParams<{ id: string }>();
  const connectionId = params.id;

  const { data: connection } = useConnection(connectionId);
  const { data: schema, isLoading: schemaLoading, error: schemaError } = useIntrospectSchema(connectionId);
  const { data: savedConfig, isLoading: configLoading } = useSchemaConfig(connectionId);
  const saveMutation = useSaveSchemaConfig();

  if (schemaLoading || configLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Schema Configuration"
          description={connection?.name || "Loading..."}
          icon={<Database className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Connections", href: "/connections" },
            { label: connection?.name || "Loading..." },
            { label: "Schema" },
          ]}
        />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Schema Configuration"
          description="Failed to load schema"
          icon={<Database className="h-5 w-5" />}
          breadcrumbs={[
            { label: "Connections", href: "/connections" },
            { label: connection?.name || "Error" },
            { label: "Schema" },
          ]}
        />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <Database className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Failed to introspect schema</p>
                <p className="text-xs text-muted-foreground/80 mb-4">
                  Make sure the database is accessible and the connection details are correct.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/connections">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    Back to Connections
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Schema Configuration"
        description="Select tables and columns to expose in the dashboard"
        icon={<Database className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Connections", href: "/connections" },
          { label: connection?.name || "Connection" },
          { label: "Schema" },
        ]}
      />

      {schema ? (
        <SchemaConfigurator
          schema={schema}
          savedConfig={savedConfig ?? undefined}
          connectionId={connectionId}
          onSave={async (config) => {
            await saveMutation.mutateAsync({ connectionId, config });
          }}
          isSaving={saveMutation.isPending}
        />
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Database className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground/60">No tables found in the database.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
