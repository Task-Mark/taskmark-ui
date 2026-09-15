export const OFFICIAL_SITE_URL = "https://taskmark.dev"

function siteHost(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

export function AppFooter({
  version,
  siteUrl = OFFICIAL_SITE_URL,
}: {
  version: string
  siteUrl?: string
}) {
  return (
    <>
      <div aria-hidden className="h-8 shrink-0" />
      <footer className="fixed inset-x-0 bottom-0 z-40 h-8 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-2 px-4 text-[11px] text-muted-foreground">
          <p>
            Taskmark{" "}
            <span className="font-medium text-foreground">v{version}</span>
          </p>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {siteHost(siteUrl)}
          </a>
        </div>
      </footer>
    </>
  )
}
