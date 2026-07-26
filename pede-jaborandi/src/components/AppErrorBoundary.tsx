// src/components/AppErrorBoundary.tsx
//
// Error boundary do app raiz. Não usa o Sentry.ErrorBoundary porque isso
// puxaria o SDK pro bundle crítico — em vez disso reporta via reportError,
// que só baixa o SDK quando um crash realmente acontece.

import { Component, type ReactNode } from 'react'
import { CrashScreen } from './LoadingScreen'
import { reportError } from '../lib/sentry'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error)
  }

  render() {
    if (this.state.hasError) return <CrashScreen />
    return this.props.children
  }
}
