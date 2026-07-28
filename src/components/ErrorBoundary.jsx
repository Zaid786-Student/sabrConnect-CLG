import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Swap this for a real error-reporting call (Sentry, LogRocket, etc.)
    // when you have one wired up.
    console.error('SabrConnect crashed:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false })
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-white">Something went wrong</h1>
          <p className="max-w-md text-sm text-white/50">
            An unexpected error occurred and this page couldn't load. Try again, or head back to the homepage.
          </p>
          <button onClick={this.handleReset} className="btn-primary">
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
