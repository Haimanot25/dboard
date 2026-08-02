"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-start gap-2 text-xs text-destructive p-4">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{this.state.error?.message ?? "Something went wrong"}</span>
        </div>
      );
    }
    return this.props.children;
  }
}
