import type { WorkItemDetail, WorkItemRef } from "./detail-types"
import type { ProjectEpicList } from "./epic-types"
import type {
  EpicWorkItemsList,
  WorkItemsViewList,
} from "./flat-work-item-types"
import type { StoryItemList } from "./item-types"
import type { ProjectStatusMetrics } from "./project-metrics-shared"
import type { BoardReport } from "./report-types"
import type { SolvedCompletionSample } from "./timeframe-filters"
import type { DiscoveredProject } from "./types"

export const SNAPSHOT_PATH = "/taskmark-snapshot.json"

export type BoardSnapshot = {
  version: 1
  builtAt: string
  project: DiscoveredProject
  projects: DiscoveredProject[]
  epics: ProjectEpicList
  workItemsView: WorkItemsViewList
  /** Epic id → overall work-items list for that epic */
  workItemsByEpic: Record<string, EpicWorkItemsList>
  /** `${epicId}::${storyId}` → sub-task list */
  itemsByStory: Record<string, StoryItemList>
  statusMetrics: ProjectStatusMetrics
  countableCompletions: SolvedCompletionSample[]
  /** Board-root CHANGELOG.md; null when missing or whitespace-only. */
  changelogMarkdown: string | null
  /**
   * Board `.reports/` files, newest first. Optional so snapshots built before
   * reports existed still load.
   */
  reports?: BoardReport[]
  /**
   * Hide completed seed for the first paint. Optional so snapshots built
   * before the shared preference existed still load.
   */
  hideCompleted?: boolean
  /** Board-relative file path → detail (children attached) */
  detailsByPath: Record<string, WorkItemDetail>
  /** Work item id → ref for sheet open-by-id */
  refsById: Record<string, WorkItemRef>
}

export function storyKey(epicId: string, storyId: string): string {
  return `${epicId}::${storyId}`
}
