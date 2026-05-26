# Fincenzo

**Budgeting and net-worth tracking for individuals — and the couples they live with.**

Most money apps make you pick between *mine* and *ours*. Fincenzo lets you keep both. Track your own accounts, your own budget, your own goals — then explicitly choose what to share with a partner. Nothing is shared by default. Everything is reversible.

---

## Why Fincenzo

- **Two-tier privacy that matches real relationships.** You and your partner each have your own login and your own accounts. A *household* is a shared layer on top — you flip a switch to share an account or a budget category, and you can flip it back any time. Joint checking and shared rent? Sure. Personal credit card and gift fund? Stay private.

- **Automatic by default.** Link your banks, credit cards, and brokerages via Plaid. Transactions and balances sync in the background. You review and re-categorize — you don't enter data.

- **Net worth, not just monthly spend.** Assets minus liabilities, charted over time. Daily snapshots so the line keeps moving even when you don't log in.

- **Smart categorization that learns.** Plaid's categories out of the box, your overrides on top, and rules that remember ("Whenever I shop at X, call it Y").

- **A calm, modern dashboard.** Light surfaces, generous whitespace, charts as the focal point. Designed to be checked in 30 seconds, not lived in.

## How the household works

Alice and Bob each sign up separately and link their own accounts. Alice creates a household and invites Bob.

- Alice shares her joint checking but keeps her personal credit card private.
- Bob shares his joint checking but keeps his brokerage private.
- The **household view** shows only the two shared checkings — joint budget, joint net worth, joint cash flow.
- Each of them still has a **personal view** that includes everything they own, shared *and* private.

Sharing is per-account, opt-in, and reversible. A partner never sees what you haven't explicitly shared.

## What's inside

- 🏦 **Account aggregation** — checking, savings, credit, investment, via Plaid
- 📊 **Dashboard** — net worth, income/expense, recent transactions, category breakdown
- 💰 **Budgets** — monthly category budgets with progress bars and over-budget alerts
- 🎯 **Goals** — savings targets with progress charts
- 📈 **Net worth over time** — daily snapshots, charted
- 👫 **Households** — invite a partner, share what you choose, keep the rest private

## Roadmap

Phases 1 (solo) and 2 (households) are shipped. Phase 3 (recurring/subscription tracking, cash-flow forecasting, exports, mobile polish) is in progress. See the [roadmap](content/docs/developers/roadmap.mdx) for the full breakdown.

## For developers

Docs live under [content/docs/](content/docs/) and render at `/docs` on the running site. The developer-focused pages are:

- 📘 [Architecture & tech stack](content/docs/developers/architecture.mdx)
- 🛠️ [Local development & testing](content/docs/developers/development.mdx)
- 🚀 [Going to production with Plaid](content/docs/developers/plaid-production.mdx)
- 🗺️ [Roadmap](content/docs/developers/roadmap.mdx)

---

Fincenzo is currently single-developer, single-user (the author) — built in the open as a real product, not a demo.
