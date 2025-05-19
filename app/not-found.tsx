import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark-900 text-white p-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-mono font-bold text-primary-500 mb-4">Page Not Found</h1>
        <p className="text-dark-200 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link 
          href="/" 
          className="px-4 py-2 bg-primary-600/20 border border-primary-600/30 text-primary-400 hover:bg-primary-600/30 transition-all font-mono"
        >
          Go to Chat
        </Link>
      </div>
    </div>
  );
}
