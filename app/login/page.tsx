"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      if (role === "ADMIN") window.location.href = "/admin/dashboard";
      else if (role === "COUNSELLOR") window.location.href = "/counsellor/dashboard";
      else if (role === "TEACHER") window.location.href = "/teacher/dashboard";
      else window.location.href = "/reception/dashboard";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 bg-gradient-to-br from-[#0a2347] via-[#0E356B] to-[#0d3a7a] p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/5" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="bg-white rounded-2xl px-6 py-3 inline-block shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/square-logo.jpg" alt="Global Gate Educational Consultancy" width={160} height={160} className="object-contain" />
          </div>
        </div>

        {/* Center text */}
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">
            LeadFlow CRM
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Manage leads, students, counselling, and classes — all in one place.
          </p>
          <div className="flex gap-6 pt-4">
            <div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-blue-300 mt-0.5">Data secure</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">4 Roles</p>
              <p className="text-xs text-blue-300 mt-0.5">Admin · Counsellor · Reception · Teacher</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-blue-400 text-xs">
          © {new Date().getFullYear()} Global Gate Educational Consultancy Pvt. Ltd.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6 sm:p-12">
        {/* Logo — always visible on right panel */}
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/square-logo.jpg" alt="Global Gate Educational Consultancy" width={160} height={160} className="object-contain" />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@globalgate.edu"
                autoComplete="email"
                className="h-11 bg-white border-gray-200 focus:border-[#0E356B] focus:ring-[#0E356B]/10"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-11 bg-white border-gray-200 focus:border-[#0E356B] focus:ring-[#0E356B]/10 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#0E356B] hover:bg-[#0a2a56] text-white font-semibold text-sm rounded-lg transition-all shadow-sm mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Global Gate Educational Consultancy &mdash; LeadFlow CRM
          </p>
        </div>
      </div>
    </div>
  );
}
