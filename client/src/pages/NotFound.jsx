import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-3xl text-reel-100">Page not found</h1>
      <p className="text-reel-400">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="focus-ring rounded-lg bg-marquee-500 px-4 py-2 font-semibold text-reel-950 hover:bg-marquee-400"
      >
        Back to home
      </Link>
    </div>
  );
}
