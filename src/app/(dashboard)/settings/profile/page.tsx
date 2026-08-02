"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, ShieldCheck, LogOut, Loader2, Check } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const email = session?.user?.email ?? "";
  const role: string =
    (session?.user as Record<string, unknown> | undefined)?.role?.toString() ?? "editor";

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", origin: window.location.origin },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update profile");
      await update({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <PageHeader
        title="Profile"
        description="Manage your account information"
        icon={<User className="h-5 w-5" />}
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Profile" }]}
      />

      <div className="grid gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xl font-bold text-primary ring-1 ring-primary/20">
                {email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{name || email}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="capitalize">{role}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="max-w-sm"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input value={email} disabled className="max-w-sm opacity-70" />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saved ? "Saved" : "Save changes"}
                </Button>
                {saved && !saving && <Check className="h-4 w-4 text-emerald-500" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Sign out</h3>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                End your current session on this device.
              </p>
            </div>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => router.push("/settings")}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Back to settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}