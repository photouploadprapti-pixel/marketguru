'use server'

import { revalidatePath } from 'next/cache'

/**
 * Run one warmup pass immediately, used by the dashboard refresh control.
 */
export const actionRunWarmupTick = async () => {
  const { runWarmupTick } = await import('@/lib/warmup/warmup-engine')
  await runWarmupTick()
  revalidatePath('/warmup')
  return { ok: true, message: 'Warmup cycle finished.' }
}
