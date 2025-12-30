export default function TestErrorsNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-muted mb-6">
            <span className="text-4xl font-bold text-muted-foreground">404</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Test Error Page - 404 Not Found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          This page is configured to return 404 status code for testing purposes.
        </p>
      </div>
    </div>
  );
}











