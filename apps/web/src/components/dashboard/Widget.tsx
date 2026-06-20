import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { AsyncState } from "../../lib/useAsync";
import { Card, EmptyState, SkeletonLines } from "../ui";
import styles from "./Widget.module.css";

interface WidgetProps<T> {
  title: string;
  eyebrow?: ReactNode;
  to: string;
  state: AsyncState<T>;
  /** Treat resolved data as empty (renders the empty state). */
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
}

/** Dashboard card shell: header + "View all", with loading/error/empty states. */
export function Widget<T>({ title, eyebrow, to, state, isEmpty, emptyMessage, children }: WidgetProps<T>) {
  const { data, loading, error } = state;

  return (
    <Card className={styles.widget}>
      <div className={styles.header}>
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 className={styles.title}>{title}</h2>
        </div>
        <Link to={to} className={styles.viewAll}>
          View all <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      <div className={styles.body}>
        {loading ? (
          <SkeletonLines count={4} />
        ) : error ? (
          <EmptyState tone="error" title="Could not load" message={error.message} />
        ) : data && (!isEmpty || !isEmpty(data)) ? (
          children(data)
        ) : (
          <EmptyState title="Nothing here yet" message={emptyMessage ?? "Check back soon."} />
        )}
      </div>
    </Card>
  );
}
