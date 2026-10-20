import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Diagnostic log without leaking credentials
    console.error('MessSaver Application Error caught by boundary:', error.message, errorInfo.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleReturnHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#151916] text-[#F7F5EF] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#1C221E] border border-[#28312B] shadow-2xl text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold font-editorial text-[#F7F5EF]">
                Application Experience Interrupted
              </h2>
              <p className="text-xs text-[#A9B7A0] leading-relaxed">
                An unexpected frontend execution error occurred. The system safely contained the fault to protect operational data.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#D8F078] hover:bg-[#E4F88D] text-[#151916] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-glow-lime"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
              <button
                onClick={this.handleReturnHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#151916] hover:bg-[#28312B] border border-[#28312B] text-xs font-semibold text-[#A9B7A0] hover:text-[#F7F5EF] transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
