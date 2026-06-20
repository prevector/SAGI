import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./Table.module.css";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => number | string;
  align?: "left" | "right";
  mono?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Highlight a row (e.g. the current user). */
  highlight?: (row: T) => boolean;
  caption?: string;
}

export function Table<T>({ columns, rows, rowKey, highlight, caption }: TableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [rows, sort, columns]);

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    setSort((prev) =>
      prev?.key === col.key ? { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: "desc" }
    );
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        {caption ? <caption className={styles.caption}>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={[col.align === "right" ? styles.right : "", col.sortValue ? styles.sortable : ""].join(" ")}
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {col.sortValue ? (
                    <button type="button" className={styles.sortBtn} onClick={() => toggleSort(col)}>
                      {col.header}
                      {active ? (
                        sort!.dir === "asc" ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className={highlight?.(row) ? styles.highlight : ""}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[col.align === "right" ? styles.right : "", col.mono ? styles.mono : ""].join(" ")}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
