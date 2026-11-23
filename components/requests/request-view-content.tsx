import type { RequestBoardData } from "../../lib/board-model/request-types"
import type { RequestView } from "../../lib/board-model/request-nav"
import { ClientStatusPanel } from "./client-status-panel"
import { RequestPage } from "./request-page"
import { RequestsList } from "./requests-list"
import { RoadmapPanel } from "./roadmap-panel"
import { WorkHub, type WorkSelection } from "./work-hub"

/** Picks the request screen for a view. Shared by the live and static apps. */
export function RequestViewContent({
  view,
  data,
  projectName,
  request,
  meeting,
  period,
}: {
  view: RequestView
  data: RequestBoardData
  projectName: string
  request?: string | null
  meeting?: string | null
  period?: string | null
}) {
  const selection: WorkSelection = meeting
    ? { kind: "meeting", id: meeting }
    : request
      ? { kind: "request", id: request }
      : null
  switch (view) {
    case "work":
      return <WorkHub data={data} projectName={projectName} selection={selection} />
    case "requests":
      return <RequestsList data={data} projectName={projectName} />
    case "request":
      return <RequestPage data={data} requestId={request ?? ""} />
    case "roadmap":
      return <RoadmapPanel data={data} projectName={projectName} />
    case "status":
      return <ClientStatusPanel data={data} projectName={projectName} period={period ?? null} />
  }
}
