import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-void px-6 text-center">
      <div>
        <p className="text-6xl font-bold tracking-tight text-blurple-soft">404</p>
        <h1 className="mt-3 text-xl font-semibold">This channel doesn&apos;t exist</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          The page you were looking for has been moved, deleted, or never existed.
        </p>
        <Link
          href="/channels"
          className="mt-6 inline-flex rounded-lg bg-blurple px-4 py-2 text-sm font-semibold text-white transition hover:bg-blurple-soft"
        >
          Back to channels
        </Link>
      </div>
    </div>
  );
}
