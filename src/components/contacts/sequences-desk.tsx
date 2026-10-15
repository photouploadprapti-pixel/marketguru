'use client'

import { useState, type FormEvent } from 'react'

import {
  actionCreateSequence,
  actionDeleteTemplate,
  actionRunSequences,
  actionSaveTemplate,
} from '@/actions/action-marketing'
import type { ContactList, Enrollment, MailTemplate, Sequence } from '@/types/marketing'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-parchment-50 outline-none placeholder:text-parchment-500 focus:border-ember-400'

type SequencesDeskProps = {
  templates: MailTemplate[]
  lists: ContactList[]
  sequences: Sequence[]
  enrollments: Enrollment[]
  accounts: { id: string; email: string }[]
}

/**
 * Saved templates and delayed follow-up sequences.
 * @param props - Templates, lists, sequences, and mailboxes
 */
export const SequencesDesk = ({
  templates,
  lists,
  sequences,
  enrollments,
  accounts,
}: SequencesDeskProps) => {
  const [notice, setNotice] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [subject, setSubject] = useState('Hello {Name}')
  const [body, setBody] = useState('<p>Hi {Name},</p><p>Writing from {City}.</p>')
  const [name, setName] = useState('')
  const [listId, setListId] = useState(lists[0]?.id ?? '')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [stepSubject, setStepSubject] = useState('Hello {Name}')
  const [stepBody, setStepBody] = useState('<p>Hi {Name},</p>')
  const [followSubject, setFollowSubject] = useState('Following up, {Name}')
  const [followBody, setFollowBody] = useState('<p>Hi {Name}, just a short follow-up.</p>')
  const [delayDays, setDelayDays] = useState('3')
  const [running, setRunning] = useState(false)

  const onTemplate = async (event: FormEvent) => {
    event.preventDefault()
    const result = await actionSaveTemplate({ name: templateName, subject, body })
    setNotice(result.message)
    if (result.ok) setTemplateName('')
  }

  const onSequence = async (event: FormEvent) => {
    event.preventDefault()
    const result = await actionCreateSequence({
      name,
      listId,
      accountId,
      steps: [
        { delayDays: 0, subject: stepSubject, body: stepBody },
        {
          delayDays: Number.parseInt(delayDays, 10) || 3,
          subject: followSubject,
          body: followBody,
        },
      ],
    })
    setNotice(result.message)
  }

  const onRun = async () => {
    setRunning(true)
    const result = await actionRunSequences()
    setNotice(result.message)
    setRunning(false)
  }

  return (
    <div className="space-y-8">
      {notice ? <p className="text-sm text-ember-200">{notice}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-parchment-400">
          A sequence sends step one, waits, then sends the follow-up unless they replied,
          bounced, or asked not to be contacted.
        </p>
        <button
          type="button"
          disabled={running}
          onClick={onRun}
          className="rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          {running ? 'Sending...' : 'Send due follow-ups'}
        </button>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={onTemplate} className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
          <h2 className="font-display text-2xl text-parchment-50">Template</h2>
          <p className="mt-2 text-sm text-parchment-400">Use {'{Name}'} and {'{City}'} in the subject or body.</p>
          <input className={`${inputClass} mt-4`} value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" />
          <input className={`${inputClass} mt-3`} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" />
          <textarea className={`${inputClass} mt-3 min-h-28`} value={body} onChange={(event) => setBody(event.target.value)} />
          <button type="submit" className="mt-4 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950">
            Save template
          </button>
          <ul className="mt-4 space-y-2 text-sm">
            {templates.map((template) => (
              <li key={template.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-left text-parchment-100"
                  onClick={() => {
                    setSubject(template.subject)
                    setBody(template.body)
                    setStepSubject(template.subject)
                    setStepBody(template.body)
                  }}
                >
                  {template.name}
                </button>
                <button
                  type="button"
                  className="text-xs text-parchment-500"
                  onClick={async () => setNotice((await actionDeleteTemplate(template.id)).message)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </form>

        <form onSubmit={onSequence} className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
          <h2 className="font-display text-2xl text-parchment-50">New sequence</h2>
          <input className={`${inputClass} mt-4`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sequence name" required />
          <select className={`${inputClass} mt-3`} value={listId} onChange={(event) => setListId(event.target.value)} required>
            <option value="">Choose a list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
          </select>
          <select className={`${inputClass} mt-3`} value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
            <option value="">Choose a mailbox</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.email}</option>
            ))}
          </select>
          <p className="mt-4 text-xs tracking-[0.14em] text-parchment-500 uppercase">Step 1, immediately</p>
          <input className={`${inputClass} mt-2`} value={stepSubject} onChange={(event) => setStepSubject(event.target.value)} />
          <textarea className={`${inputClass} mt-2 min-h-20`} value={stepBody} onChange={(event) => setStepBody(event.target.value)} />
          <p className="mt-4 text-xs tracking-[0.14em] text-parchment-500 uppercase">Step 2, after a wait</p>
          <input className={`${inputClass} mt-2`} type="number" min={1} value={delayDays} onChange={(event) => setDelayDays(event.target.value)} />
          <input className={`${inputClass} mt-2`} value={followSubject} onChange={(event) => setFollowSubject(event.target.value)} />
          <textarea className={`${inputClass} mt-2 min-h-20`} value={followBody} onChange={(event) => setFollowBody(event.target.value)} />
          <button type="submit" className="mt-4 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950">
            Save and enroll the list
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {sequences.map((sequence) => {
          const rows = enrollments.filter((item) => item.sequenceId === sequence.id)
          const active = rows.filter((item) => item.status === 'active').length
          return (
            <article key={sequence.id} className="rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3">
              <p className="text-parchment-50">{sequence.name}</p>
              <p className="mt-1 text-sm text-parchment-400">
                {sequence.steps.length} steps · {active} still active · {rows.length} enrolled
              </p>
            </article>
          )
        })}
        {!sequences.length ? (
          <p className="text-sm text-parchment-400">No sequences yet.</p>
        ) : null}
      </section>
    </div>
  )
}
