import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand mb-4">403</h1>
        <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>
        <Link href="/" className="text-brand hover:underline">Go back home</Link>
      </div>
    </div>
  );
}
