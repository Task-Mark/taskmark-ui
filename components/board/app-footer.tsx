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
    <footer className="mt-auto border-t-2 border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
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
  )
}
