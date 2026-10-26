"use client";

import { useState } from "react";
import { HardHat, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";

export function LoginScreen() {
  const { setUser, setView } = useAppStore();
  const [email, setEmail] = useState("admin@inspections.demo");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // credentials:"include" is required so the Set-Cookie response header
      // is honoured by the browser for subsequent same-origin requests.
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Login failed");
      }
      // Verify the session cookie was actually set by the browser by issuing
      // a follow-up GET /api/auth. If the cookie wasn't accepted, this will
      // return { user: null } and we show a clear error instead of letting
      // the user think login succeeded but then see "Failed to load" on the
      // next page.
      const verify = await fetch("/api/auth", {
        method: "GET",
        credentials: "include",
      });
      const verifyBody = await verify.json().catch(() => ({}));
      if (!verifyBody?.user) {
        throw new Error(
          "Login succeeded on the server but the session cookie was not accepted by your browser. Please enable cookies for this site and try again.",
        );
      }
      setUser(verifyBody.user);
      setView("dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function fill(role: "ADMIN" | "INSPECTOR" | "APPROVER") {
    if (role === "ADMIN") {
      setEmail("admin@inspections.demo");
      setPassword("admin123");
    } else if (role === "INSPECTOR") {
      setEmail("inspector@inspections.demo");
      setPassword("inspector123");
    } else {
      setEmail("approver@inspections.demo");
      setPassword("approver123");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-zinc-900 text-amber-400">
            <HardHat className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Inspection Report Automation
            </h1>
            <p className="text-sm text-zinc-500">Equipment Master Management Module</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your account credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Authentication failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-5 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs">
              <div className="mb-1 font-semibold text-zinc-700">Demo accounts</div>
              <button
                type="button"
                onClick={() => fill("ADMIN")}
                className="block w-full text-left hover:text-amber-700"
              >
                <span className="font-mono">admin@inspections.demo</span> / admin123 (Administrator)
              </button>
              <button
                type="button"
                onClick={() => fill("INSPECTOR")}
                className="block w-full text-left hover:text-amber-700"
              >
                <span className="font-mono">inspector@inspections.demo</span> / inspector123 (Inspector)
              </button>
              <button
                type="button"
                onClick={() => fill("APPROVER")}
                className="block w-full text-left hover:text-amber-700"
              >
                <span className="font-mono">approver@inspections.demo</span> / approver123 (Report Approver)
              </button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-zinc-500">
          DEMO BUILD · Use for evaluation only. Sample dimensions are illustrative
          and must not be used as engineering design values.
        </p>
      </div>
    </div>
  );
}
