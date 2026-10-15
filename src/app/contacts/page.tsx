import { ContactsDesk } from '@/components/contacts/contacts-desk'
import { PageIntro } from '@/components/page-intro'
import { loadDesk } from '@/lib/desk/store'

export const dynamic = 'force-dynamic'

/**
 * Saved contacts, lists, and addresses that must not be mailed.
 */
const ContactsPage = async () => {
  const desk = await loadDesk()
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <PageIntro
        kicker="Contacts"
        title="People you can mail later"
        description="Save discoveries from Place Finder, Email Finder, and cleaned CSVs. Put them on a list, then use that list in a campaign or a sequence."
      />
      <ContactsDesk
        contacts={desk.contacts}
        lists={desk.lists}
        suppressions={desk.suppressions}
      />
    </main>
  )
}

export default ContactsPage
