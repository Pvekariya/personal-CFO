# Personal CFO OS

An AI-powered personal finance operating system that consolidates accounts, tracks net worth, and gives CFO-style financial insights, built for people who want institutional-grade money management without hiring a wealth manager.

**Live demo:** https://personal-cfo-g35h.vercel.app/

## What it does

Personal CFO OS pulls together every part of a person's financial life into one dashboard: bank accounts, transactions, investments, liabilities, goals, and net worth, then layers an AI assistant on top that reads the data and gives direct recommendations instead of just showing charts.

## Key Features

**Unified Dashboard**
Real-time view of net worth, monthly cash flow, and a financial health score (0–100) with specific, actionable callouts like emergency fund adequacy and EMI load.

**Multi-Account Aggregation**
Consolidate balances across savings, current, and business accounts from multiple banks into one total, with per-account breakdowns.

**Smart Transaction Tracking**
Manual entry, statement upload, or auto-import. Transactions are categorized automatically and grouped by day with running totals.

**Investment Portfolio Management**
Track mutual funds, FDs, stocks, and other assets against a target allocation. Includes a rebalancing engine that shows live gaps between target and actual allocation across equity, debt, gold, crypto, and more, and a capital allocation engine that suggests how to split new cash.

**Liabilities & Loan Optimizer**
Track loans and overdrafts with interest rates and EMIs. A repayment simulator shows how extra monthly prepayments reduce loan duration and total interest paid, and identifies which debt to pay off first.

**Net Worth Tracking**
Historical net worth snapshots charted over time, with an assets-vs-liabilities breakdown.

**Goal-Based Financial Planning**
Set targets (car, house, retirement) and get inflation-adjusted future cost projections with the required monthly SIP to hit them. Includes a Monte Carlo probability simulator and a step-up SIP calculator.

**Automated Reports**
Print-ready monthly financial statements with income, expenses, savings rate, category-wise breakdowns, and CSV export.

**AI CFO Assistant**
An embedded AI assistant with memory of the user's financial context, able to answer questions and give recommendations grounded in actual account data.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Getting Started

```bash
git clone https://github.com/Pvekariya/personal-CFO.git
cd personal-CFO
npm install
```

Set up your environment variables (database URL, API keys) in `.env`, then:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it.

## Status

Actively developed. Core modules (dashboard, accounts, transactions, investments, liabilities, goals, reports, net worth tracking) are live. Currency conversion and bank statement auto-import are in progress.

## Author

**Pratik Vekariya**
[GitHub](https://github.com/Pvekariya)
