import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to Sentry/LogRocket
    console.error('TaxPulse error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center space-y-5">
            <div className="text-6xl">⚠️</div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Something went wrong</h1>
              <p className="text-slate-500 text-sm mt-2">
                TaxPulse ran into an unexpected error. Your data is safe — this is just a display issue.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-50 rounded-xl p-3 text-left">
                <p className="text-xs font-mono text-slate-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-cac-green text-white py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
              >
                Reload App
              </button>
            </div>
            <p className="text-xs text-slate-400">
              If this keeps happening, email{' '}
              <a href="mailto:support@taxpulse.ng" className="text-cac-green font-bold hover:underline">
                support@taxpulse.ng
              </a>
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
