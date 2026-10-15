import { NextResponse } from 'next/server'
import { promises as dns } from 'dns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DKIM_SELECTORS = ['google', 'selector1', 'selector2', 'k1', 's1', 'default', 'dkim']

/**
 * Whether a value is a plain object.
 * @param value - Parsed JSON
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Join TXT chunks into one record string.
 * @param records - DNS TXT answers
 */
const joinTxt = (records: string[][]): string[] =>
  records.map((chunks) => chunks.join('').toLowerCase())

/**
 * Check SPF, DMARC, and common DKIM selectors for a mailbox domain.
 */
export const POST = async (request: Request) => {
  try {
    const parsed: unknown = await request.json()
    const domain = isRecord(parsed) && typeof parsed.domain === 'string'
      ? parsed.domain.trim().toLowerCase().replace(/^@/, '')
      : ''
    const host = domain.includes('@') ? domain.split('@').pop() ?? '' : domain
    if (!host || !host.includes('.')) {
      return NextResponse.json({ ok: false, error: 'Enter a domain such as studio.com.' }, { status: 400 })
    }

    const [spfRecords, dmarcRecords] = await Promise.all([
      dns.resolveTxt(host).catch(() => [] as string[][]),
      dns.resolveTxt(`_dmarc.${host}`).catch(() => [] as string[][]),
    ])
    const spf = joinTxt(spfRecords).some((record) => record.includes('v=spf1'))
    const dmarc = joinTxt(dmarcRecords).some((record) => record.includes('v=dmarc1'))

    let dkim = false
    for (const selector of DKIM_SELECTORS) {
      const name = `${selector}._domainkey.${host}`
      const records = await dns.resolveTxt(name).catch(() => [] as string[][])
      const cname = await dns.resolveCname(name).catch(() => [] as string[])
      if (cname.length || joinTxt(records).some((record) => record.includes('v=dkim1'))) {
        dkim = true
        break
      }
    }

    const safe = spf && dmarc
    return NextResponse.json({
      ok: true,
      domain: host,
      spf,
      dkim,
      dmarc,
      safe,
      note: safe
        ? 'SPF and DMARC are present. That is a reasonable sign it is safe to send today. This check does not scan blacklists.'
        : 'Add SPF and DMARC before sending. This check only looks at public DNS, not blacklists.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DNS lookup failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
