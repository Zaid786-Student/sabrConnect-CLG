export default function GoogleButton({ onClick, loading, label = 'Continue with Google' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-bg-border bg-white/[0.02] py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.05] disabled:opacity-60"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.8 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.9 5.1 29.8 3 24 3c-7.7 0-14.3 4.4-17.7 10.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 45c5.7 0 10.7-1.9 14.6-5.2l-6.7-5.7c-2 1.5-4.7 2.4-7.9 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 40.5 16.2 45 24 45z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.7 5.7C41.7 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"
        />
      </svg>
      {loading ? 'Connecting…' : label}
    </button>
  )
}
