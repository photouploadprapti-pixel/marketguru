import Link from 'next/link'

/**
 * Fallback when a route or mailbox id does not exist.
 */
const NotFoundPage = () => (
  <section className="mx-auto max-w-lg px-6 py-24 text-center">
    <h1 className="font-display text-4xl text-parchment-50">That page is gone.</h1>
    <p className="mt-3 text-parchment-400">It may have been removed, or the link is out of date.</p>
    <Link
      href="/"
      className="mt-6 inline-flex rounded-full bg-ember-500 px-5 py-2.5 text-sm font-medium text-ink-950"
    >
      Back to the desk
    </Link>
  </section>
)

export default NotFoundPage
