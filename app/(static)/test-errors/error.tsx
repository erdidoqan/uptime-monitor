'use client';

export default function TestErrorsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Only show 500 error UI if it's our test error
  const isTestError = error.message?.includes('Test Error Route');
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-red-100 dark:bg-red-900/30 mb-6">
            <span className="text-4xl font-bold text-red-600 dark:text-red-400">500</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Test Error Page - 500 Server Error
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {isTestError 
            ? 'This page is configured to return 500 status code for testing purposes.'
            : 'An error occurred while loading this page.'}
        </p>
        {isTestError && (
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            type="button"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

