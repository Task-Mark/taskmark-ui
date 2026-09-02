"use client"

import { ListSearchBox } from "./list-search-box"
import { HideCompletedToggle } from "./hide-completed-toggle"
import { ParentFilterCombobox } from "./parent-filter-combobox"
import { TagsMultiselectFilter } from "./tags-multiselect-filter"
import type { ParentFilterOption } from "../../lib/board-model/list-filters"
import { cn } from "@taskmark/components"

type ListFiltersBarProps = {
  query: string
  onQueryChange: (query: string) => void
  hideCompleted: boolean
  onHideCompletedChange: (hide: boolean) => void
  /** Work items: parent autocomplete options. */
  parentOptions?: ParentFilterOption[]
  parentKeys?: string[]
  onParentKeysChange?: (keys: string[]) => void
  /** Work items (or any list with tags): multiselect. */
  tagOptions?: string[]
  selectedTags?: string[]
  onSelectedTagsChange?: (tags: string[]) => void
  searchId?: string
  className?: string
}

export function ListFiltersBar({
  query,
  onQueryChange,
  hideCompleted,
  onHideCompletedChange,
  parentOptions,
  parentKeys = [],
  onParentKeysChange,
  tagOptions,
  selectedTags = [],
  onSelectedTagsChange,
  searchId,
  className,
}: ListFiltersBarProps) {
  const showParent = Boolean(parentOptions && onParentKeysChange)
  const showTags = Boolean(tagOptions && onSelectedTagsChange)

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border pb-3",
        className
      )}
      role="search"
    >
      <ListSearchBox
        id={searchId}
        value={query}
        onChange={onQueryChange}
      />
      {showParent ? (
        <ParentFilterCombobox
          options={parentOptions!}
          value={parentKeys}
          onChange={onParentKeysChange!}
        />
      ) : null}
      {showTags ? (
        <TagsMultiselectFilter
          options={tagOptions!}
          value={selectedTags}
          onChange={onSelectedTagsChange!}
        />
      ) : null}
      <HideCompletedToggle
        checked={hideCompleted}
        onCheckedChange={onHideCompletedChange}
        id={searchId ? `${searchId}-hide-completed` : undefined}
      />
    </div>
  )
}
