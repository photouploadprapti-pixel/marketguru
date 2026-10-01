declare module 'imapflow' {
  export type MailboxObject = {
    path: string
    exists?: number
  }

  export type SearchObject = {
    seen?: boolean
    from?: string
    subject?: string
    header?: { [key: string]: string }
    since?: Date
  }

  export type FetchMessageObject = {
    uid: number
    source?: Buffer
    envelope?: {
      subject?: string
      from?: Array<{ address?: string; name?: string }>
    }
    flags?: Set<string>
  }

  export class ImapFlow {
    constructor(options: {
      host: string
      port: number
      secure: boolean
      auth: { user: string; pass: string }
      logger: boolean
    })

    usable: boolean
    connect(): Promise<void>
    logout(): Promise<void>
    mailboxOpen(path: string): Promise<MailboxObject>
    getMailboxLock(path: string): Promise<{ release: () => void }>
    search(query: SearchObject, options?: { uid?: boolean }): Promise<number[] | false>
    fetch(
      range: number[] | string,
      query: { source?: boolean; envelope?: boolean; flags?: boolean },
      options?: { uid?: boolean },
    ): AsyncIterable<FetchMessageObject>
    fetchAll(
      range: number[],
      query: { source?: boolean; envelope?: boolean; flags?: boolean },
      options?: { uid?: boolean },
    ): Promise<FetchMessageObject[]>
    messageFlagsAdd(
      uid: number,
      flags: string[],
      options?: { uid?: boolean },
    ): Promise<boolean>
    messageMove(
      uid: number,
      dest: string,
      options?: { uid?: boolean },
    ): Promise<boolean>
  }
}
