import "./styles.css";
import type {
  ActivityEvent,
  Bounty,
  DashboardSnapshot,
  LeaderboardEntry,
  OrganismCard,
  SessionInfo
} from "@sagi/shared";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root not found.");
}

const app = root;

function badge(status: "verified" | "pending"): string {
  return `<span class="badge badge--${status}">${status}</span>`;
}

function organismMarkup(organism: OrganismCard): string {
  return `
    <article class="panel organism-card">
      <div class="organism-card__top">
        <div>
          <p class="eyebrow">${organism.id}</p>
          <h3>${organism.title}</h3>
        </div>
        ${badge(organism.status)}
      </div>
      <p class="organism-card__trait">${organism.trait}</p>
      <p class="muted">${organism.summary}</p>
      <div class="chip">${organism.lineage}</div>
    </article>
  `;
}

function bountyMarkup(bounty: Bounty): string {
  return `
    <article class="panel bounty-card">
      <div class="bounty-card__top">
        <h3>${bounty.title}</h3>
        ${badge(bounty.status)}
      </div>
      <p class="muted">${bounty.focus}</p>
      <p class="bounty-card__reward">${bounty.reward}</p>
    </article>
  `;
}

function leaderboardRow(entry: LeaderboardEntry): string {
  return `
    <tr>
      <td>${entry.rank}</td>
      <td>${entry.organism}</td>
      <td>${entry.transferScore}</td>
      <td>${badge(entry.status)}</td>
      <td>${entry.reward}</td>
    </tr>
  `;
}

function activityItem(event: ActivityEvent): string {
  return `
    <li class="activity-item">
      <div class="activity-item__time">${event.time}</div>
      <div>
        <h3>${event.title}</h3>
        <p class="muted">${event.description}</p>
      </div>
    </li>
  `;
}

function renderDashboard(snapshot: DashboardSnapshot): void {
  app.innerHTML = `
    <main class="dashboard-shell">
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">Search for Artificial General Intelligence</p>
          <h1>From manifesto to live system.</h1>
          <p class="hero__text">${snapshot.subheadline}</p>
          <div class="hero__actions">
            <button class="button button--primary">Join the network</button>
            <button class="button button--secondary" data-action="logout">Log out</button>
          </div>
        </div>
        <div class="hero__visual panel">
          <p class="eyebrow">Live field</p>
          <h2>${snapshot.headline}</h2>
          <div class="signal-grid" aria-hidden="true">
            ${Array.from({ length: 36 }, (_, index) => `<span style="--delay:${index * 70}ms"></span>`).join("")}
          </div>
          <p class="muted">A mock emergence field for the hackathon MVP.</p>
        </div>
      </section>

      <section class="metrics-grid">
        ${snapshot.metrics
          .map(
            (metric) => `
              <article class="panel metric-card">
                <p class="eyebrow">${metric.label}</p>
                <h2>${metric.value}</h2>
                <p class="muted">${metric.detail}</p>
              </article>
            `
          )
          .join("")}
      </section>

      <section class="content-grid">
        <div class="panel span-2">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Population state</p>
              <h2>Current search status</h2>
            </div>
            <p class="muted">Snapshot generated ${new Date(snapshot.generatedAt).toLocaleString()}.</p>
          </div>
          <div class="population-grid">
            ${snapshot.population
              .map(
                (stat) => `
                  <article class="population-stat">
                    <p class="eyebrow">${stat.label}</p>
                    <h3>${stat.value}</h3>
                    <p class="muted">${stat.change}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>

        <aside class="panel">
          <p class="eyebrow">Mission</p>
          <h2>Why this exists</h2>
          <p class="muted">
            Instead of assuming transformers are the only route to intelligence, SAGI searches many architectures,
            learning rules, and memory systems in parallel.
          </p>
        </aside>
      </section>

      <section class="content-grid">
        <div class="panel span-2">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Candidate organisms</p>
              <h2>Watch the population learn</h2>
            </div>
          </div>
          <div class="cards-grid">
            ${snapshot.organisms.map(organismMarkup).join("")}
          </div>
        </div>

        <div class="panel">
          <p class="eyebrow">Recent activity</p>
          <h2>Lab log</h2>
          <ul class="activity-list">
            ${snapshot.activity.map(activityItem).join("")}
          </ul>
        </div>
      </section>

      <section class="content-grid">
        <div class="panel span-2">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Leaderboard</p>
              <h2>Verified transfer scores</h2>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Organism</th>
                  <th>Transfer</th>
                  <th>Status</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                ${snapshot.leaderboard.map(leaderboardRow).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <p class="eyebrow">Open bounties</p>
          <h2>Direct the search</h2>
          <div class="stack">
            ${snapshot.bounties.map(bountyMarkup).join("")}
          </div>
        </div>
      </section>
    </main>
  `;

  const logoutButton = app.querySelector<HTMLButtonElement>('[data-action="logout"]');
  logoutButton?.addEventListener("click", async () => {
    await fetch("/api/auth/logout", {
      method: "POST"
    });

    await boot();
  });
}

function renderError(message: string): void {
  app.innerHTML = `
    <main class="dashboard-shell">
      <section class="panel error-state">
        <p class="eyebrow">Connection issue</p>
        <h1>Dashboard unavailable</h1>
        <p class="muted">${message}</p>
      </section>
    </main>
  `;
}

function renderLoading(title: string, detail: string): void {
  app.innerHTML = `
    <main class="dashboard-shell">
      <section class="panel loading-state">
        <p class="eyebrow">Booting SAGI</p>
        <h1>${title}</h1>
        <p class="muted">${detail}</p>
      </section>
    </main>
  `;
}

function renderLogin(session: SessionInfo): void {
  app.innerHTML = `
    <main class="dashboard-shell">
      <section class="auth-layout">
        <article class="panel auth-copy">
          <p class="eyebrow">SAGI Access</p>
          <h1>Simple auth for the MVP.</h1>
          <p class="hero__text">
            Production asks only for a username and stores it in a simple signed session. Local development bypasses auth automatically.
          </p>
          <div class="auth-mode-chip">Mode: ${session.mode}</div>
        </article>

        <article class="panel auth-panel">
          <form id="login-form" class="auth-form">
            <label class="field">
              <span class="field__label">Username</span>
              <input
                class="field__input"
                type="text"
                name="username"
                autocomplete="username"
                placeholder="tim"
                required
              />
            </label>
            <button class="button button--primary auth-submit" type="submit">Unlock dashboard</button>
            <p class="muted auth-hint">For local development, just run <code>npm run dev</code>.</p>
            <p class="auth-error" hidden></p>
          </form>
        </article>
      </section>
    </main>
  `;

  const form = app.querySelector<HTMLFormElement>("#login-form");
  const errorNode = app.querySelector<HTMLParagraphElement>(".auth-error");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      if (errorNode) {
        errorNode.hidden = false;
        errorNode.textContent = "Enter any username to continue.";
      }
      return;
    }

    await boot();
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function boot(): Promise<void> {
  renderLoading("Loading mock dashboard", "Checking access and fetching the current search snapshot.");

  try {
    const session = await fetchJson<SessionInfo>("/api/session");

    if (!session.authenticated) {
      renderLogin(session);
      return;
    }

    const snapshot = await fetchJson<DashboardSnapshot>("/api/dashboard");
    renderDashboard(snapshot);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    renderError(message);
  }
}

void boot();
