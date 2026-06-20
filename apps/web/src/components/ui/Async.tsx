import type { ReactNode } from "react";
import type { AsyncState } from "../../lib/useAsync";
import { EmptyState } from "./EmptyState";
import { SkeletonLines } from "./Skeleton";

interface AsyncProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
}

/** Render-prop for page-level async data: skeleton / error / empty / data. */
export function Async<T>({ state, children, loading, isEmpty, emptyTitle, emptyMessage }: AsyncProps<T>) {
  if (state.loading) return <>{loading ?? <SkeletonLines count={6} />}</>;
  if (state.error) return <EmptyState tone="error" title="Could not load" message={state.error.message} />;
  if (!state.data || (isEmpty && isEmpty(state.data))) {
    return <EmptyState title={emptyTitle ?? "Nothing here yet"} message={emptyMessage} />;
  }
  return <>{children(state.data)}</>;
}
