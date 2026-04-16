/**
 * PageSpinner — Shared full-height centered loading spinner.
 * Replaces the repeated `if (isLoading) return <spinner>` pattern in admin pages.
 */
export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
    </div>
  );
}

/**
 * FullPageSpinner — For public pages that need a full-screen loading state.
 */
export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600"></div>
    </div>
  );
}
