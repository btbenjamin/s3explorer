import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'OVH S3 Explorer',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(79,70,229,0.12),transparent_25%),radial-gradient(circle_at_30%_80%,rgba(16,185,129,0.08),transparent_30%)]">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  )
}
