'use client'

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Visible fallback when a server render fails.
 * @param props - Reset callback from Next.js
 */
const ErrorPage = ({ reset }: ErrorPageProps) => (
  <div className="flex min-h-[60vh] items-center justify-center px-6">
    <section className="max-w-lg rounded-[2rem] border border-white/5 bg-ink-900/70 px-8 py-16 text-center">
      <h1 className="font-display text-4xl text-parchment-50">Something went wrong.</h1>
      <p className="mt-3 text-parchment-400">Try again. The rest of the desk is still available.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex rounded-full bg-ember-500 px-5 py-2.5 text-sm font-medium text-ink-950"
      >
        Try again
      </button>
    </section>
  </div>
)

export default ErrorPage
