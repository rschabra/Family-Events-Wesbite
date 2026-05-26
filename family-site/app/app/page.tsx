import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight">
          Family Events
        </h1>
        <p className="text-gray-600">
          Our calendar, events, and RSVPs — all in one place.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
