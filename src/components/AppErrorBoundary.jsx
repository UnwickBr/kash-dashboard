import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App runtime error:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-50 p-6 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Runtime Error</p>
              <h1 className="text-2xl font-bold mt-2">A aplicação quebrou durante a renderização.</h1>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="font-mono text-sm break-words">{String(this.state.error?.message || this.state.error)}</p>
            </div>
            {this.state.error?.stack && (
              <pre className="rounded-2xl border border-slate-800 bg-slate-900 p-4 overflow-auto text-xs leading-6 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
