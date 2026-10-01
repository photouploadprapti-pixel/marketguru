/**
 * Turn a row range like "1-10" or "1,3,5" into zero-based indexes.
 * @param input - User-entered range
 * @param maxLen - Number of data rows
 */
export const parseRowIndices = (input: string, maxLen: number): number[] => {
  const indices: number[] = []
  const trimmed = input.trim()
  if (!trimmed) return []

  if (trimmed.includes('-') && !trimmed.includes(',')) {
    const [startRaw, endRaw] = trimmed.split('-')
    const start = Number.parseInt(startRaw ?? '', 10)
    const end = Number.parseInt(endRaw ?? '', 10)
    if (Number.isNaN(start) || Number.isNaN(end)) return []
    for (let i = start; i <= end; i += 1) indices.push(i)
  } else if (trimmed.includes(',')) {
    for (const part of trimmed.split(',')) {
      const value = Number.parseInt(part.trim(), 10)
      if (!Number.isNaN(value)) indices.push(value)
    }
  } else {
    const value = Number.parseInt(trimmed, 10)
    if (!Number.isNaN(value)) indices.push(value)
  }

  return indices.filter((index) => index >= 1 && index <= maxLen).map((index) => index - 1)
}

/**
 * Fill `{Column}` tokens in a template from one CSV row.
 * @param template - Subject or HTML body
 * @param row - Header-keyed CSV row
 */
export const fillTemplate = (template: string, row: Record<string, string>): string => {
  const name = row.Name || row['Center Name'] || 'Partner'
  let filled = template
  for (const [key, value] of Object.entries(row)) {
    filled = filled.replaceAll(`{${key}}`, value || '')
  }
  return filled.replaceAll('{Name}', name).replaceAll('{center_name}', name)
}

/**
 * Build a CSV download and trigger it in the browser.
 * @param rows - Header row plus data rows
 * @param filename - Download name
 */
export const downloadCsv = (rows: string[][], filename: string): void => {
  const lines = rows.map((row) =>
    row
      .map((value) => {
        const clean = String(value).replaceAll('"', '""')
        return /[",\n]/.test(clean) ? `"${clean}"` : clean
      })
      .join(','),
  )
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
