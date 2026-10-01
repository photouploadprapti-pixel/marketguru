import { AdminFinderApp } from '@/components/finder/admin-finder-app'

/**
 * Domain email discovery, Gmail sending, and delivery status.
 */
const FinderPage = () => (
  <main className="mx-auto max-w-6xl px-6 py-8">
    <p className="text-xs tracking-[0.18em] text-ember-300 uppercase">Finder</p>
    <h1 className="mt-2 font-display text-4xl text-parchment-50">Email Finder</h1>
    <p className="mt-2 mb-6 max-w-2xl text-sm text-parchment-400">
      Look up a person on a domain, send through the Gmail account in your environment, and
      check which messages bounced.
    </p>
    <div className="rounded-[2rem] bg-slate-100 p-4 sm:p-8">
      <AdminFinderApp />
    </div>
  </main>
)

export default FinderPage
