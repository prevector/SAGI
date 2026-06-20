import type { ReactNode } from "react";
import { Check, Circle, Cpu, Play } from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  type Column,
  Delta,
  EmptyState,
  MetricChart,
  PageHeader,
  ProgressBar,
  Skeleton,
  Sparkline,
  Stat,
  StatusChip,
  Table,
  Tag
} from "../components/ui";

interface DemoRow {
  rank: number;
  name: string;
  tokens: number;
}

const rows: DemoRow[] = [
  { rank: 1, name: "ada", tokens: 128400 },
  { rank: 2, name: "lin", tokens: 96250 },
  { rank: 3, name: " favo", tokens: 51020 }
];

const cols: Column<DemoRow>[] = [
  { key: "rank", header: "#", render: (r) => r.rank, mono: true, sortValue: (r) => r.rank },
  { key: "name", header: "Organism", render: (r) => r.name },
  { key: "tokens", header: "Tokens", render: (r) => r.tokens.toLocaleString(), align: "right", mono: true, sortValue: (r) => r.tokens }
];

const series = [
  { key: "a", label: "Transfer", points: Array.from({ length: 12 }, (_, i) => ({ t: `2026-06-${i + 1}`, v: 0.4 + i * 0.03 })), tone: "teal" as const },
  { key: "b", label: "Compute", points: Array.from({ length: 12 }, (_, i) => ({ t: `2026-06-${i + 1}`, v: 0.3 + Math.sin(i) * 0.1 + i * 0.02 })), tone: "orange" as const, dash: true }
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ display: "grid", gap: "var(--s4)" }}>
      <h2 style={{ fontSize: "var(--fs-h3)" }}>{title}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s4)", alignItems: "center" }}>{children}</div>
    </Card>
  );
}

export default function SandboxPage() {
  return (
    <div style={{ display: "grid", gap: "var(--s5)" }}>
      <PageHeader eyebrow="Dev" title="Primitives sandbox" subtitle="Every shared UI primitive on-brand against the tokens." />

      <Section title="Buttons">
        <Button variant="primary" icon={<Play size={15} />}>Start session</Button>
        <Button variant="reward">Claim reward</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" disabled>Disabled</Button>
      </Section>

      <Section title="Status & tags (colour + icon + text)">
        <StatusChip tone="teal" icon={<Circle size={13} />} label="Open" />
        <StatusChip tone="orange" icon={<Play size={13} />} label="Live" />
        <StatusChip tone="neutral" icon={<Check size={13} />} label="Closed" />
        <Tag tone="teal" icon={<Cpu size={12} />}>hardware</Tag>
        <Tag tone="orange">quant</Tag>
        <Tag>lab</Tag>
      </Section>

      <Section title="Deltas & stats">
        <Delta value={1280} />
        <Delta value={-42} />
        <Delta value={0} />
        <Stat label="Total tokens" value="128,400" icon={<Cpu size={16} />} delta={<Delta value={1280} />} hint="24h" />
        <Stat label="Progress" size="lg" value="61%" />
      </Section>

      <Section title="Progress & spark">
        <div style={{ width: 240 }}>
          <ProgressBar value={0.61} label="Progress to AGI" />
        </div>
        <div style={{ width: 240 }}>
          <ProgressBar value={0.34} label="Bounty" tone="orange" />
        </div>
        <Sparkline values={[3, 5, 4, 7, 6, 9, 8, 12]} />
        <Sparkline values={[8, 6, 7, 4, 5, 3, 4, 2]} tone="orange" />
      </Section>

      <Section title="Avatars & skeletons">
        <Avatar seed="ada" />
        <Avatar seed="lin" />
        <Avatar seed="favo" />
        <div style={{ width: 200, display: "grid", gap: "var(--s2)" }}>
          <Skeleton height="1.4rem" />
          <Skeleton width="70%" />
        </div>
      </Section>

      <Card style={{ display: "grid", gap: "var(--s4)" }}>
        <h2 style={{ fontSize: "var(--fs-h3)" }}>Table</h2>
        <Table columns={cols} rows={rows} rowKey={(r) => r.name} highlight={(r) => r.name === "ada"} />
      </Card>

      <Card style={{ display: "grid", gap: "var(--s4)" }}>
        <h2 style={{ fontSize: "var(--fs-h3)" }}>Metric chart (dash + end labels)</h2>
        <MetricChart series={series} valueFormat={(n) => n.toFixed(2)} />
      </Card>

      <EmptyState
        icon={<Circle size={22} />}
        title="Nothing here yet"
        message="Empty states invite the next action in the interface voice."
        action={<Button variant="primary">Do the thing</Button>}
      />
    </div>
  );
}
