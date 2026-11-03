'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

// Set to false once /api/company and /api/ask are live.
const USE_PLACEHOLDER_DATA = false

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Company = {
  name: string
  website: string
  description: string
  yearFounded: number | null
  employeeRange: string
  companyType: string
}

type CompanyResponse = {
  found: boolean
  company: Company | null
  confidence: number
}

type AskResponse = {
  answer: string
  fieldsUsed: string[]
}

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; fieldsUsed: string[]; notInData: boolean }
  | { id: string; role: 'error'; text: string }

/* -------------------------------------------------------------------------- */
/*  Placeholder data                                                          */
/* -------------------------------------------------------------------------- */

const PLACEHOLDER_COMPANIES: Record<string, Company> = {
  'northwind.io': {
    name: 'Northwind Labs',
    website: 'https://northwind.io',
    description:
      'Northwind Labs builds logistics software that helps mid-market retailers forecast demand, route shipments, and reduce warehouse waste.',
    yearFounded: 2016,
    employeeRange: '201–500',
    companyType: 'Private',
  },
  'lumenhq.com': {
    name: 'Lumen HQ',
    website: 'https://lumenhq.com',
    description:
      'Lumen HQ is a design collaboration platform for product teams, combining whiteboarding, prototyping, and feedback in one workspace.',
    yearFounded: 2020,
    employeeRange: '51–200',
    companyType: 'Venture-backed startup',
  },
}

const NOT_IN_DATA_ANSWER = "That information isn't available in this company's data."

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function placeholderCompany(domain: string): Promise<CompanyResponse> {
  await sleep(900)
  const company = PLACEHOLDER_COMPANIES[domain]
  return company ? { found: true, company, confidence: 1 } : { found: false, company: null, confidence: 0 }
}

async function placeholderAsk(domain: string, question: string): Promise<AskResponse> {
  await sleep(700)
  const c = PLACEHOLDER_COMPANIES[domain]
  const q = question.toLowerCase()
  if (!c) return { answer: NOT_IN_DATA_ANSWER, fieldsUsed: [] }

  if (/(found|founded|start|year|old|since)/.test(q) && c.yearFounded)
    return { answer: `${c.name} was founded in ${c.yearFounded}.`, fieldsUsed: ['yearFounded', 'name'] }
  if (/(employee|staff|people|team size|headcount|how big|size)/.test(q))
    return { answer: `${c.name} has ${c.employeeRange} employees.`, fieldsUsed: ['employeeRange', 'name'] }
  if (/(type|public|private|startup|structure)/.test(q))
    return { answer: `${c.name} is a ${c.companyType.toLowerCase()} company.`, fieldsUsed: ['companyType', 'name'] }
  if (/(website|url|site|domain|link)/.test(q))
    return { answer: `The company's website is ${c.website}.`, fieldsUsed: ['website'] }
  if (/(what|do|does|product|build|about|describe|business)/.test(q))
    return { answer: c.description, fieldsUsed: ['description'] }

  return { answer: NOT_IN_DATA_ANSWER, fieldsUsed: [] }
}

/* -------------------------------------------------------------------------- */
/*  API                                                                       */
/* -------------------------------------------------------------------------- */

async function fetchCompany(domain: string): Promise<CompanyResponse> {
  if (USE_PLACEHOLDER_DATA) return placeholderCompany(domain)
  const res = await fetch('/api/company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

async function askQuestion(domain: string, question: string): Promise<AskResponse> {
  if (USE_PLACEHOLDER_DATA) return placeholderAsk(domain, question)
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, question }),
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function normalizeDomain(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
}

const NOT_IN_DATA_PATTERN =
  /(not (available|in the data|included|provided|found)|isn['’]t (available|in the data|included)|no (information|data) (about|on|regarding)|doesn['’]t (contain|include|have))/i

function isNotInData(answer: AskResponse) {
  return answer.fieldsUsed.length === 0 || NOT_IN_DATA_PATTERN.test(answer.answer)
}

const uid = () => Math.random().toString(36).slice(2, 10)

function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*  Components                                                                */
/* -------------------------------------------------------------------------- */

function Header() {
  return (
    <header className="flex flex-col gap-3 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400/80">Grounded answers</p>
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">Company Q&amp;A</h1>
      <p className="text-pretty text-base leading-relaxed text-zinc-400">
        Ask anything about a company. Answers come only from its data.
      </p>
    </header>
  )
}

function DomainForm({
  loading,
  error,
  onLoad,
}: {
  loading: boolean
  error: string | null
  onLoad: (domain: string) => void
}) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!loading && value.trim()) onLoad(value)
  }

  return (
    <section aria-label="Load a company" className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="domain" className="sr-only">
          Company domain
        </label>
        <input
          id="domain"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. northwind.io"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'domain-error' : 'domain-hint'}
          className="h-12 flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 aria-[invalid=true]:border-red-500/50"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner />
              <span>Loading…</span>
            </>
          ) : (
            'Load company'
          )}
        </button>
      </form>
      {error ? (
        <p
          id="domain-error"
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-red-400" />
          {error}
        </p>
      ) : (
        <p id="domain-hint" className="px-1 text-xs text-zinc-500">
          {USE_PLACEHOLDER_DATA ? 'Placeholder mode — try northwind.io or lumenhq.com.' : 'Enter a company domain.'}
        </p>
      )}
    </section>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200">{value}</dd>
    </div>
  )
}

function CompanyCard({ company, confidence }: { company: Company; confidence: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence > 1 ? confidence / 100 : confidence)) * 100)
  const host = company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <article className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-2xl shadow-black/40 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">{company.name}</h2>
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit font-mono text-sm text-amber-400/90 underline-offset-4 hover:text-amber-300 hover:underline"
          >
            {host}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-300">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-400" />
          Confidence: {pct}%
        </span>
      </div>

      <p className="mt-5 text-pretty leading-relaxed text-zinc-300">{company.description}</p>

      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-6 sm:grid-cols-3">
        <ProfileField label="Founded" value={company.yearFounded ? String(company.yearFounded) : '—'} />
        <ProfileField label="Employees" value={company.employeeRange || '—'} />
        <ProfileField label="Type" value={company.companyType || '—'} />
      </dl>
    </article>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-amber-400 px-4 py-2.5 text-sm leading-relaxed text-zinc-950">
          {message.text}
        </p>
      </li>
    )
  }

  if (message.role === 'error') {
    return (
      <li className="flex justify-start">
        <p role="alert" className="max-w-[85%] rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-300">
          {message.text}
        </p>
      </li>
    )
  }

  if (message.notInData) {
    return (
      <li className="flex justify-start">
        <div className="flex max-w-[85%] items-start gap-3 rounded-2xl border border-dashed border-zinc-700 px-4 py-3">
          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-zinc-500" />
          <div className="flex flex-col gap-0.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Not in the data</p>
            <p className="text-sm italic leading-relaxed text-zinc-400">{message.text}</p>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-col items-start gap-1.5">
      <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-800/60 px-4 py-2.5 text-sm leading-relaxed text-zinc-100">
        {message.text}
      </p>
      {message.fieldsUsed.length > 0 && (
        <p className="px-1 font-mono text-[11px] text-zinc-500">
          Based on: <span className="text-zinc-400">{message.fieldsUsed.join(', ')}</span>
        </p>
      )}
    </li>
  )
}

function ChatBox({ domain, companyName }: { domain: string; companyName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function send() {
    const question = input.trim()
    if (!question || sending) return
    setInput('')
    setMessages((m) => [...m, { id: uid(), role: 'user', text: question }])
    setSending(true)
    try {
      const res = await askQuestion(domain, question)
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'assistant', text: res.answer, fieldsUsed: res.fieldsUsed ?? [], notInData: isNotInData(res) },
      ])
    } catch {
      setMessages((m) => [...m, { id: uid(), role: 'error', text: 'Something went wrong. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      send()
    }
  }

  return (
    <section
      aria-label={`Ask about ${companyName}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
        <h2 className="text-sm font-medium text-zinc-200">Ask about {companyName}</h2>
        <span className="font-mono text-[11px] text-zinc-500">{domain}</span>
      </div>

      <div ref={listRef} className="max-h-[28rem] min-h-56 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.length === 0 && !sending ? (
          <div className="flex h-full min-h-46 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-zinc-500">No questions yet.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['When was it founded?', 'How many employees?', 'Who is the CEO?'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {sending && (
              <li className="flex items-center gap-2 text-sm text-zinc-500">
                <Spinner className="size-3.5" />
                <span>Looking through the data…</span>
              </li>
            )}
          </ul>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-zinc-800 p-3">
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <textarea
          id="question"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a question…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-medium text-zinc-950 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<{ domain: string; company: Company; confidence: number } | null>(null)

  async function handleLoad(raw: string) {
    const domain = normalizeDomain(raw)
    if (!domain) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCompany(domain)
      if (res.found && res.company) {
        setLoaded({ domain, company: res.company, confidence: res.confidence })
      } else {
        setLoaded(null)
        setError(`We couldn't find a company for "${domain}".`)
      }
    } catch {
      setLoaded(null)
      setError('Something went wrong while loading the company. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-20rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl"
      />
      <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-16 sm:py-24">
        <Header />
        <DomainForm loading={loading} error={error} onLoad={handleLoad} />
        {loaded && (
          <>
            <CompanyCard company={loaded.company} confidence={loaded.confidence} />
            <ChatBox key={loaded.domain} domain={loaded.domain} companyName={loaded.company.name} />
          </>
        )}
      </main>
    </div>
  )
}
