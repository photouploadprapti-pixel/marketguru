'use client'

import { useState } from 'react'

import { actionReplyToMessage, actionSyncInbox } from '@/actions/action-inbox'
import { cn } from '@/lib/cn'
import { INTENT_LABELS, type InboxMessage, type ReplyIntent } from '@/types/inbox'

const FILTERS: Array<ReplyIntent | 'all'> = [
  'all',
  'interested',
  'not_interested',
  'out_of_office',
  'unknown',
]

const intentClass: Record<ReplyIntent, string> = {
  interested: 'bg-emerald-500/15 text-emerald-200',
  not_interested: 'bg-rose-500/15 text-rose-200',
  out_of_office: 'bg-amber-500/15 text-amber-100',
  unknown: 'bg-white/10 text-parchment-300',
}

type InboxDeskProps = {
  messages: InboxMessage[]
  ephemeral: boolean
  modelEnabled: boolean
}

/**
 * One list of replies from every connected mailbox, with intent labels.
 * @param props - Cached messages and labeling mode
 */
export const InboxDesk = ({ messages, ephemeral, modelEnabled }: InboxDeskProps) => {
  const [filter, setFilter] = useState<ReplyIntent | 'all'>('all')
  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? '')
  const [reply, setReply] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const selected = messages.find((item) => item.id === selectedId) ?? null
  const visible = messages.filter((item) => filter === 'all' || item.intent === filter)

  const refresh = async () => {
    setPending(true)
    const result = await actionSyncInbox()
    setMessage(result.message)
    setPending(false)
  }

  const send = async () => {
    if (!selected) return
    setPending(true)
    const result = await actionReplyToMessage(selected.id, reply)
    setMessage(result.message)
    if (result.ok) setReply('')
    setPending(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs',
                filter === item ? 'bg-ember-500 text-ink-950' : 'bg-white/5 text-parchment-300',
              )}
            >
              {item === 'all' ? 'All' : INTENT_LABELS[item]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { void refresh() }}
          disabled={pending}
          className="rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
        >
          {pending ? 'Working...' : 'Refresh mailboxes'}
        </button>
      </div>
      {ephemeral ? (
        <p className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          This inbox cache resets on Vercel until Turso is configured.
        </p>
      ) : null}
      <p className="mb-4 text-xs text-parchment-500">
        {modelEnabled
          ? 'Replies are labeled by the model in OPENAI_API_KEY. Rules cover anything the model skips.'
          : 'Replies are labeled from phrases such as interested, not interested, and out of office. Add OPENAI_API_KEY to use a model.'}
      </p>
      {message ? <p className="mb-4 text-sm text-parchment-300">{message}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-white/10 px-4 py-6 text-sm text-parchment-400">
              No replies yet. Connect mailboxes in Warmup, then refresh.
            </p>
          ) : visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                'w-full rounded-2xl border px-3 py-3 text-left',
                item.id === selected?.id ? 'border-ember-400/50 bg-ink-800' : 'border-white/10 bg-ink-900/70',
              )}
            >
              <span className={cn('rounded-full px-2 py-0.5 text-[11px]', intentClass[item.intent])}>
                {INTENT_LABELS[item.intent]}
              </span>
              <p className="mt-2 truncate text-sm text-parchment-50">{item.fromName}</p>
              <p className="truncate text-xs text-parchment-400">{item.subject}</p>
              <p className="mt-1 line-clamp-2 text-xs text-parchment-500">{item.snippet}</p>
            </button>
          ))}
        </div>
        {selected ? (
          <article className="rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-5">
            <p className="text-xs text-parchment-500">
              To {selected.accountEmail} · {new Date(selected.receivedAt).toLocaleString()}
            </p>
            <h2 className="mt-1 font-display text-3xl text-parchment-50">{selected.subject}</h2>
            <p className="mt-1 text-sm text-parchment-300">
              {selected.fromName} · {selected.fromEmail}
            </p>
            <pre className="mt-4 max-h-80 overflow-auto text-sm whitespace-pre-wrap text-parchment-100">
              {selected.text || selected.snippet}
            </pre>
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={`Reply as ${selected.accountEmail}`}
              className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-ink-950 px-3 py-2 text-sm text-parchment-50 outline-none focus:border-ember-400"
            />
            <button
              type="button"
              onClick={() => { void send() }}
              disabled={pending}
              className="mt-3 rounded-full bg-ember-500 px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-50"
            >
              {selected.repliedAt ? 'Send another reply' : 'Send reply'}
            </button>
          </article>
        ) : null}
      </div>
    </div>
  )
}
