type PageIntroProps = {
  kicker: string
  title: string
  description: string
}

/**
 * Page title block used across the dashboard sections.
 * @param props - Kicker, title, and short description
 */
export const PageIntro = ({ kicker, title, description }: PageIntroProps) => (
  <header className="mb-8">
    <p className="text-xs tracking-[0.18em] text-ember-300 uppercase">{kicker}</p>
    <h1 className="mt-2 font-display text-4xl text-parchment-50">{title}</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-parchment-400">{description}</p>
  </header>
)
