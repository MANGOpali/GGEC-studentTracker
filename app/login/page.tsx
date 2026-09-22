"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, GlobeIcon } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Login failed");
        return;
      }

      const role = json.user.role;
      if (role === "ADMIN") router.push("/admin/dashboard");
      else if (role === "COUNSELLOR") router.push("/counsellor/dashboard");
      else router.push("/reception/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0E356B] to-[#1a4e9a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <GlobeIcon size={26} className="text-[#0E356B]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Global Gate</h1>
          <p className="text-blue-200 text-sm mt-1">LeadFlow — Education Consultancy CRM</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-800">Sign in to your account</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@globalgate.edu"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" />Signing in...</> : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-gray-400 text-center">Demo credentials:</p>
              <div className="mt-2 space-y-1 text-xs text-gray-500 text-center">
                <p>Admin: admin@globalgate.edu / Admin@123456</p>
                <p>Counsellor: priya@globalgate.edu / Counsellor@123456</p>
                <p>Reception: reception@globalgate.edu / Reception@123456</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
