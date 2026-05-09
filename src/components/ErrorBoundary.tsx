"use client";

import React, { Component, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
            <p className="text-sm text-zinc-400 max-w-md">
              Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte.
            </p>
            {this.state.error && (
              <p className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 font-mono text-xs text-red-400 border border-zinc-800 max-w-md">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-400 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
