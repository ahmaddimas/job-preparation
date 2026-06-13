import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-600">404</h1>
        <p className="mt-2 text-sm text-slate-400">Page not found</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
