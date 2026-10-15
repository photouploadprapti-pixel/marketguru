'use client'

import { useState, type FormEvent } from 'react'

import { actionCreateList, actionDeleteContact, actionDeleteList, actionAddSuppression, actionRemoveSuppression, actionSaveContacts } from '@/actions/action-contacts'
import type { ContactList, SavedContact, Suppression } from '@/types/marketing'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400'

type ContactsDeskProps = {
  contacts: SavedContact[]
  lists: ContactList[]
  suppressions: Suppression[]
}

/**
 * Saved contacts, lists, and the do-not-contact book.
 * @param props - Current desk collections
 */
export const ContactsDesk = ({ contacts, lists, suppressions }: ContactsDeskProps) => {
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [listName, setListName] = useState('')
  const [blockEmail, setBlockEmail] = useState('')

  const onAdd = async (event: FormEvent) => {
    event.preventDefault()
    const result = await actionSaveContacts([
      { name, email, city, source: 'manual' },
    ])
    setNotice(result.message)
    if (result.ok) {
      setName('')
      setEmail('')
      setCity('')
    }
  }

  const onList = async (event: FormEvent) => {
    event.preventDefault()
    const result = await actionCreateList(listName)
    setNotice(result.message)
    if (result.ok) setListName('')
  }

  const onBlock = async (event: FormEvent) => {
    event.preventDefault()
    const result = await actionAddSuppression(blockEmail, 'manual')
    setNotice(result.message)
    if (result.ok) setBlockEmail('')
  }

  return (
    <div className="space-y-8">
      {notice ? <p className="text-sm text-ember-200">{notice}</p> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={onAdd} className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
          <h2 className="font-display text-2xl text-parchment-50">Add a contact</h2>
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-parchment-300">Name</span>
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1.5 block text-parchment-300">Email</span>
            <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1.5 block text-parchment-300">City</span>
            <input className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <button type="submit" className="mt-4 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950">
            Save contact
          </button>
        </form>

        <form onSubmit={onList} className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
          <h2 className="font-display text-2xl text-parchment-50">Lists</h2>
          <p className="mt-2 text-sm text-parchment-400">
            A list is the recipient source for a campaign or a follow-up sequence.
          </p>
          <input
            className={`${inputClass} mt-4`}
            value={listName}
            onChange={(event) => setListName(event.target.value)}
            placeholder="Chicago yoga studios"
          />
          <button type="submit" className="mt-4 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950">
            Create list
          </button>
          <ul className="mt-4 space-y-2 text-sm">
            {lists.map((list) => (
              <li key={list.id} className="flex items-center justify-between gap-2">
                <span className="text-parchment-100">
                  {list.name}
                  <span className="ml-2 text-parchment-500">
                    {contacts.filter((item) => item.listIds.includes(list.id)).length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={async () => setNotice((await actionDeleteList(list.id)).message)}
                  className="text-xs text-parchment-500 hover:text-parchment-100"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </form>

        <form onSubmit={onBlock} className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
          <h2 className="font-display text-2xl text-parchment-50">Do not contact</h2>
          <p className="mt-2 text-sm text-parchment-400">
            Bounces, “Not Interested,” and unsubscribes stay blocked on every send.
          </p>
          <input
            className={`${inputClass} mt-4`}
            value={blockEmail}
            onChange={(event) => setBlockEmail(event.target.value)}
            placeholder="person@studio.com"
          />
          <button type="submit" className="mt-4 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950">
            Block address
          </button>
          <ul className="mt-4 max-h-40 space-y-2 overflow-auto text-sm">
            {suppressions.map((item) => (
              <li key={item.email} className="flex items-center justify-between gap-2">
                <span className="text-parchment-200">
                  {item.email}
                  <span className="ml-2 text-xs text-parchment-500">{item.reason}</span>
                </span>
                <button
                  type="button"
                  onClick={async () => setNotice((await actionRemoveSuppression(item.email)).message)}
                  className="text-xs text-parchment-500 hover:text-parchment-100"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </form>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-800 text-parchment-400">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">City</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-t border-white/5">
                <td className="px-3 py-2 text-parchment-50">{contact.name || contact.company}</td>
                <td className="px-3 py-2 text-parchment-300">{contact.email}</td>
                <td className="px-3 py-2 text-parchment-300">{contact.city}</td>
                <td className="px-3 py-2 text-parchment-300">{contact.source}</td>
                <td className="px-3 py-2 text-right">
                  <select
                    className="mr-3 rounded-lg border border-white/10 bg-ink-950 px-2 py-1 text-xs text-parchment-200"
                    defaultValue=""
                    onChange={async (event) => {
                      const listId = event.target.value
                      if (!listId) return
                      const result = await actionSaveContacts(
                        [{ email: contact.email, source: contact.source, listId }],
                      )
                      setNotice(result.message)
                    }}
                  >
                    <option value="">Add to list</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={async () => setNotice((await actionDeleteContact(contact.id)).message)}
                    className="text-xs text-parchment-500 hover:text-parchment-100"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!contacts.length ? (
          <p className="px-4 py-6 text-sm text-parchment-400">
            No contacts yet. Save them from Place Finder, Email Finder, or a cleaned CSV.
          </p>
        ) : null}
      </section>
    </div>
  )
}
