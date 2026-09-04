# Plan: Analytics Dashboard (`workshop3/report`)

Next.js + TypeScript + Prisma reporting app on top of the existing Gold star
schema. This plan only covers design; nothing is implemented yet.

## 0. Evidence gathered (live inspection, before any design decision below)

**Database**: Azure SQL Database, SQL Server engine. Accessed today via
`mssql` (tedious driver) using an ADO-style connection string stored in the
`sqlconection` env var (`workshop2/.env`, `workshop3/.env` both already carry
this key — same shape: `Server=...;Database=...;User Id=...;Password=...;Encrypt=...`).
Parsing logic already exists at `workshop2/pipeline/dq_lib.js::buildConfig()`.

**Gold schema** (authoritative source: the actual YAML DDL in
`workshop2/pipeline/yaml/gold_*.yaml`, cross-checked against
`workshop2/create_star_schema.md`). All four tables live in the `gold`
database schema (not `dbo`):

| Table | Grain | Row count (live, checked today) |
|---|---|---|
| `gold.gold_dim_customer` | 1 row / customer, +1 "Unknown" (`customer_key = -1`) | 18,485 |
| `gold.gold_dim_product` | 1 row / currently-active product, +1 Unknown | 296 |
| `gold.gold_dim_campaign` | 1 row / campaign, +1 "No Campaign" | 6 (5 real campaigns) |
| `gold.gold_fact_sales` | 1 row / order line (`order_number`, `product_key`) | 60,398 |

Columns (exact, no invented fields):

- `gold.gold_dim_customer`: `customer_key` (PK), `customer_id`, `customer_number`, `first_name`, `last_name`, `gender`, `marital_status`, `birth_date`, `country`, `customer_since`, `dwh_load_date`.
- `gold.gold_dim_product`: `product_key` (PK), `product_id`, `product_number`, `product_name`, `category_id`, `category`, `subcategory`, `maintenance`, `product_line`, `cost`, `start_date`, `dwh_load_date`.
- `gold.gold_dim_campaign`: `campaign_key` (PK), `campaign_id`, `campaign_code`, `campaign_name`, `channel`, `campaign_type`, `discount_pct`, `dwh_load_date`.
- `gold.gold_fact_sales`: `sales_key` (PK), `order_number`, `customer_key` (FK), `product_key` (FK), `campaign_key` (FK), `order_date`, `shipping_date`, `due_date`, `sales_amount`, `quantity`, `price`, `campaign_applied_date`, `campaign_event_ts`, `dwh_load_date`.

Foreign keys: `gold_fact_sales.customer_key -> gold_dim_customer.customer_key`,
`.product_key -> gold_dim_product.product_key`,
`.campaign_key -> gold_dim_campaign.campaign_key`. Every FK is `NOT NULL` and
always resolvable (`-1` sentinel row), so joins can be `INNER JOIN`
everywhere, no null-handling needed in query code.

**Live data facts that shape the plan** (queried directly against Gold today):

- `order_date` range: `2010-12-29` to `2014-01-28`.
- Only **344 of 60,398** fact rows (0.57%) have a real campaign attribution
  (`campaign_key <> -1`); the rest are `-1` ("No Campaign"). This is real
  data, not a bug — the Campaign Analytics page must treat "attributed vs.
  not attributed" as a first-class segment, not hide it.
- No governance deliverables (`data_lineage.md`, `governance_handover.md`)
  exist yet in `workshop3/` — Part 1 hasn't been run. This plan relies
  instead on the live DDL/data above, which is the more authoritative source
  anyway.

**Project structure**: `workshop3/` currently has only `.env`, `.gitignore`,
`governance.md`, `readme.md`, `reporting.md`. No `report/` folder exists yet
— this plan creates it from scratch, self-contained, per the requirement.

## 1. Ambiguities found — flagged, not assumed

These need a decision before or during implementation. Where a default is
proposed, it's marked clearly as a proposal, not a decision.

1. **"Number of orders" is not `COUNT(*)` on the fact table.** The fact
   grain is *order line* (`order_number` + `product_key`), so one order with
   3 product lines is 3 fact rows. Any "Orders" KPI or trend must use
   `COUNT(DISTINCT order_number)`. *Proposal: use distinct-order-number
   everywhere an "order" count is shown; label line-level counts as "Order
   Lines" if ever shown separately.*
2. **Average Order Value (AOV) definition is unspecified.** Two valid readings: `SUM(sales_amount) / COUNT(DISTINCT order_number)` (order-level AOV) vs. `AVG(sales_amount)` (line-level average). *Proposal: order-level AOV, since that's the conventional business meaning — but this is a judgment call, flagging it.*
3. **No margin/profit metric is proposed.** `gold_dim_product.cost` exists, but it's a product attribute, not a per-sale-line cost snapshot — there's no `cost_at_sale` on the fact. Deriving "profit" would mean `quantity * product.cost` computed at report time using *today's* cost against *historical* sales, which silently invents a business rule (cost-at-time-of-sale vs. current cost) that isn't in the model. **Not included.** Only add if you confirm that approximation is acceptable.
4. **Campaign "performance" is limited to sales-attribution only.** There is no spend, impressions, clicks, or conversion data anywhere in Gold — only `discount_pct` (a campaign attribute) and whichever `gold_fact_sales` rows happen to carry that `campaign_key`. So "Campaign Analytics" in this plan means: *sales attributed to each campaign, by channel/type, over time, vs. discount level* — not ROI, CTR, or CAC, which would require data that doesn't exist. Flagging this explicitly since "campaign performance" often implies those metrics.
5. **`gold_dim_customer` exposes `first_name`/`last_name`.** A public-facing dashboard listing individual customer names is a PII exposure surface. *Proposal: never render individual customer rows/names in the UI; only use customer dimension fields for aggregation (`country`, `gender`, `marital_status`) and for a bounded "Top N customers by revenue" table showing an anonymized identifier (`customer_number`) instead of names, if such a table is wanted at all.* Confirm before a customer-name table is added — this plan does **not** include one.
6. **Shipping performance (`due_date` vs `shipping_date`) is not requested** by either page's spec ("sales KPIs, trends, comparisons, dimensions" / "campaign performance KPIs, trends, comparisons, dimensions"). Not included, to avoid inventing a metric. Easy to add later if wanted (`DATEDIFF(day, order_date, shipping_date)`).

If you want any of items 2-6 resolved a specific way, say so before
implementation starts; otherwise implementation proceeds with the
"Proposal" defaults above and 3-6 stay out of scope as stated.

## 2. Tech stack and how the pieces fit

- **Next.js 14 (App Router) + TypeScript**, per requirement.
- **Prisma ORM**, provider `sqlserver`. The Gold tables live in the `gold`
  database schema (not `dbo`), so `previewFeatures = ["multiSchema"]` and
  `schemas = ["gold"]` are required on the datasource — without this Prisma
  can't see non-`dbo` tables at all. This is a hard technical constraint,
  not a style choice.
- **Charts**: `recharts` (already MIT/lightweight, no new backend, works as
  a Client Component fed serialized data from a Server Component — no extra
  service to run).
- **Data flow**: React Server Components call the data-access layer
  (`lib/data/*`) directly — no internal REST/API layer needed for the
  charts themselves (Next.js Server Components can call Prisma directly).
  Route Handlers (`app/api/.../route.ts`) are added only where a filter
  needs a client-side refetch without a full page navigation (e.g. changing
  a date range without losing scroll position).

## 3. Connection string: read at runtime, no new secret format

`workshop3/report` is its own Next.js project root, so it needs its own
`.env` (Next.js doesn't read a parent directory's `.env`). To stay
consistent with the rest of the workshop and avoid introducing a second
connection-string format:

- `workshop3/report/.env` (git-ignored) carries the **same** `sqlconection`
  ADO-style string already used in `workshop2/.env` / `workshop3/.env`.
- `workshop3/report/.env.example` documents the key with a placeholder value
  only, e.g. `sqlconection=Server=<host>,1433;Database=<db>;User Id=<user>;Password=<password>;Encrypt=true`.
- `lib/env.ts` parses `sqlconection` at runtime (same key/value/`;`-split
  logic as `dq_lib.js::buildConfig`, ported to TypeScript — not imported
  cross-package, since `workshop3/report` must be self-contained) and
  builds a `sqlserver://` connection URL in the shape Prisma expects:
  `sqlserver://<host>:<port>;database=<db>;user=<user>;password=<password>;encrypt=<bool>;trustServerCertificate=<bool>`.
- `lib/prisma.ts` instantiates `PrismaClient` with
  `datasources: { db: { url: buildPrismaUrl() } }`, so the actual secret
  never appears in `schema.prisma` (which keeps `url = env("DATABASE_URL")`
  as a harmless placeholder for `prisma generate`/`prisma migrate` tooling
  that expects the env var to exist) and never gets hardcoded anywhere.
- No credentials, hosts, or connection strings appear in this plan, in
  `.env.example`, or in any generated documentation — only placeholders.

## 4. Prisma schema (`workshop3/report/prisma/schema.prisma`)

Hand-authored to match the live DDL exactly (field names mapped with
`@map`/`@@map` so Prisma models can use idiomatic camelCase while the
underlying SQL identifiers stay untouched):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider        = "sqlserver"
  url             = env("DATABASE_URL")
  schemas         = ["gold"]
}

model Customer {
  customerKey     Int      @id @map("customer_key")
  customerId      Int      @unique @map("customer_id")
  customerNumber  String?  @map("customer_number") @db.NVarChar(50)
  firstName       String?  @map("first_name") @db.NVarChar(50)
  lastName        String?  @map("last_name") @db.NVarChar(50)
  gender          String?  @db.NVarChar(10)
  maritalStatus   String?  @map("marital_status") @db.NVarChar(10)
  birthDate       DateTime? @map("birth_date") @db.Date
  country         String?  @db.NVarChar(50)
  customerSince   DateTime? @map("customer_since") @db.Date
  dwhLoadDate     DateTime @map("dwh_load_date")
  sales           Sale[]

  @@map("gold_dim_customer")
  @@schema("gold")
}

model Product {
  productKey     Int      @id @map("product_key")
  productId      Int      @unique @map("product_id")
  productNumber  String   @unique @map("product_number") @db.NVarChar(50)
  productName    String?  @map("product_name") @db.NVarChar(50)
  categoryId     String?  @map("category_id") @db.NVarChar(50)
  category       String?  @db.NVarChar(50)
  subcategory    String?  @db.NVarChar(50)
  maintenance    String?  @db.NVarChar(50)
  productLine    String?  @map("product_line") @db.NVarChar(50)
  cost           Int?
  startDate      DateTime? @map("start_date") @db.Date
  dwhLoadDate    DateTime @map("dwh_load_date")
  sales          Sale[]

  @@map("gold_dim_product")
  @@schema("gold")
}

model Campaign {
  campaignKey   Int      @id @map("campaign_key")
  campaignId    Int      @unique @map("campaign_id")
  campaignCode  String?  @map("campaign_code") @db.NVarChar(50)
  campaignName  String?  @map("campaign_name") @db.NVarChar(100)
  channel       String?  @db.NVarChar(50)
  campaignType  String?  @map("campaign_type") @db.NVarChar(50)
  discountPct   Int?     @map("discount_pct")
  dwhLoadDate   DateTime @map("dwh_load_date")
  sales         Sale[]

  @@map("gold_dim_campaign")
  @@schema("gold")
}

model Sale {
  salesKey            Int       @id @map("sales_key")
  orderNumber         String    @map("order_number") @db.NVarChar(50)
  customerKey         Int       @map("customer_key")
  productKey          Int       @map("product_key")
  campaignKey         Int       @map("campaign_key")
  orderDate           DateTime? @map("order_date") @db.Date
  shippingDate        DateTime? @map("shipping_date") @db.Date
  dueDate             DateTime? @map("due_date") @db.Date
  salesAmount         Int?      @map("sales_amount")
  quantity            Int?
  price               Int?
  campaignAppliedDate DateTime? @map("campaign_applied_date") @db.Date
  campaignEventTs     DateTime? @map("campaign_event_ts")
  dwhLoadDate         DateTime  @map("dwh_load_date")

  customer  Customer @relation(fields: [customerKey], references: [customerKey])
  product   Product  @relation(fields: [productKey], references: [productKey])
  campaign  Campaign @relation(fields: [campaignKey], references: [campaignKey])

  @@unique([orderNumber, productKey])
  @@index([customerKey])
  @@index([productKey])
  @@index([campaignKey])
  @@index([orderDate])
  @@map("gold_fact_sales")
  @@schema("gold")
}
```

`generator client { previewFeatures = ["multiSchema"] }` line added once
Prisma version is pinned in `package.json` (multiSchema graduated out of
preview in recent Prisma versions — implementation step confirms the
installed version and drops the flag if it's no longer needed).

Time-bucketed trend queries (month-over-month) need SQL Server date
truncation (`DATEFROMPARTS`/`FORMAT`), which Prisma's `groupBy` cannot
express — those specific queries use `prisma.$queryRaw` with a
parameterized `Prisma.sql` template (never string-concatenated user input),
documented per-function in the data-access layer.

## 5. Data-access layer (`lib/data/`) — reusable, one responsibility each

`lib/data/filters.ts`
- `SharedFilters` type: `{ dateFrom?: Date; dateTo?: Date; country?: string; category?: string; channel?: string }`.
- `parseFiltersFromSearchParams(searchParams)`: turns a page's `?from=&to=&country=` query string into `SharedFilters`, used identically by both pages.

`lib/data/sales.ts`
- `getSalesKpis(filters)`: total revenue (`SUM(sales_amount)`), total quantity, distinct order count, order-level AOV — one query, `$queryRaw` aggregate.
- `getSalesTrend(filters, granularity: 'month' | 'year')`: revenue + order count bucketed by `order_date`.
- `getSalesByCategory(filters)`, `getSalesByCountry(filters)`: revenue/quantity grouped by product category / customer country, for bar charts and filter dropdowns.
- `getTopProducts(filters, limit)`: revenue-ranked product list (uses `product_name`/`category`, never customer PII).

`lib/data/campaigns.ts`
- `getCampaignKpis(filters)`: attributed revenue, attributed order count, count of *distinct active campaigns with >0 attributed sales*, average discount on attributed sales. Always reports the attributed-vs-total split (see §1.4) alongside these numbers so the KPI cards can't be misread as "all sales came from campaigns."
- `getCampaignTrend(filters)`: attributed revenue over time (`campaign_applied_date`), for the trend chart.
- `getCampaignPerformance(filters)`: one row per campaign — `campaign_name`, `channel`, `campaign_type`, `discount_pct`, attributed revenue, attributed order count — the table/bar-chart backing data.
- `getCampaignByChannel(filters)`, `getCampaignByType(filters)`: attributed revenue grouped by channel / campaign type.

Every function: typed input (`SharedFilters`), typed output (an explicit
interface, not `any`), builds its `WHERE` clause from the same filter
object so both pages compose filters identically, and returns `[]`/zeroed
KPI objects (never throws) when a query legitimately has no matching rows —
the page layer decides how to render that as an empty state.

## 6. Reusable UI components (`components/`)

- `KpiCard` — label, value, optional delta/comparison, loading skeleton state, used by both pages.
- `TrendChart` — line chart (recharts `LineChart`), takes `{ date, value }[]`, one shared component for revenue-over-time and campaign-revenue-over-time.
- `ComparisonBarChart` — bar chart for "by category" / "by channel" / "by campaign type" breakdowns.
- `FilterBar` — date range + dimension dropdowns, reads/writes URL search params (so filters are shareable/bookmarkable links, no client global state needed).
- `EmptyState` — shown when a query returns no rows for the current filter combination (e.g., a date range with zero attributed campaigns).
- `ErrorState` — shown when a data-access call throws (DB unreachable, etc.); pairs with an `error.tsx` boundary per route.
- `LoadingSkeleton` — shared shimmer block used inside `loading.tsx` for both routes and inside individual `<Suspense>` boundaries around slower chart queries.

## 7. Pages

### `/sales-trends` (`app/sales-trends/page.tsx`)
- KPI row: Total Revenue, Total Orders (distinct), Total Quantity, Average Order Value.
- Revenue trend chart (monthly, `order_date`) with a period-over-period comparison (current range vs. immediately preceding range of equal length — computed by running `getSalesKpis` twice, not a new metric).
- Revenue by Category bar chart, Revenue by Country bar chart.
- Top 10 Products by Revenue table.
- Filters: date range, category, country.
- Loading: `loading.tsx` skeleton; each chart section wrapped in its own `<Suspense>` so KPI cards render before slower breakdown queries finish.
- Empty: `EmptyState` when a filter combination yields zero fact rows.
- Error: `error.tsx` route boundary + `ErrorState` for query failures.

### `/campaign-analytics` (`app/campaign-analytics/page.tsx`)
- KPI row: Attributed Revenue, Attributed Orders, Active Campaigns (with attributed sales), Average Discount on Attributed Sales — each explicitly labeled "attributed" and paired with a small "X% of total revenue" note so the sparsity (§0) is visible, not hidden.
- Attributed-revenue trend chart (by `campaign_applied_date`).
- Campaign performance table: one row per campaign (name, channel, type, discount %, attributed revenue, attributed orders), sortable.
- Revenue by Channel and Revenue by Campaign Type bar charts.
- Filters: date range, channel, campaign type.
- Same loading/empty/error pattern as Sales Trends, reusing the same components.
- Explicit empty-state copy for the realistic case of "no campaigns match this filter" (likely given only 5 real campaigns exist).

## 8. File layout

```
workshop3/report/
├── .env.example
├── .env                      (git-ignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── prisma/
│   └── schema.prisma
├── lib/
│   ├── env.ts                (parses sqlconection -> Prisma URL)
│   ├── prisma.ts             (PrismaClient singleton)
│   └── data/
│       ├── filters.ts
│       ├── sales.ts
│       └── campaigns.ts
├── components/
│   ├── KpiCard.tsx
│   ├── TrendChart.tsx
│   ├── ComparisonBarChart.tsx
│   ├── FilterBar.tsx
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   └── LoadingSkeleton.tsx
└── app/
    ├── layout.tsx
    ├── page.tsx               (redirects to /sales-trends)
    ├── sales-trends/
    │   ├── page.tsx
    │   ├── loading.tsx
    │   └── error.tsx
    └── campaign-analytics/
        ├── page.tsx
        ├── loading.tsx
        └── error.tsx
```

## 9. `package.json` (planned scripts/dependencies)

```json
{
  "name": "gold-analytics-report",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.20.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0"
  }
}
```

Exact version pins get resolved to latest-compatible at `npm install` time
during implementation; ranges above are the planned floor.

## 10. `.env.example`

```
# Same ADO-style connection string used across the workshop (workshop2/.env, workshop3/.env).
# Never commit the real value — this file only documents the expected shape.
sqlconection=Server=<host>,1433;Database=<database>;User Id=<user>;Password=<password>;Encrypt=true;TrustServerCertificate=false
```

## 11. Local run instructions (for the readme this plan will ship with)

1. `cd workshop3/report`
2. `cp .env.example .env` and fill in the real `sqlconection` value (same one used elsewhere in the workshop).
3. `npm install`
4. `npx prisma generate` (also runs automatically via `postinstall`)
5. `npm run dev`
6. Open `http://localhost:3000` — redirects to `/sales-trends`.

## 12. Explicitly out of scope (YAGNI, ties back to §1)

- No authentication/authorization layer — not requested, and no user/role model exists in Gold to base one on.
- No write paths — this is a read-only reporting app; Prisma is used purely for typed reads.
- No caching/ISR beyond Next.js request-level defaults — dataset is small (60k fact rows) and query patterns are simple aggregates; add `revalidate`/caching only if a real latency problem shows up.
- No customer-level PII display (§1.5).
- No margin/profit, shipping-lag, or campaign-ROI metrics (§1.3, §1.4, §1.6) until confirmed.

## 13. Open questions for you before implementation

1. Confirm the AOV definition (§1.2): order-level (`SUM(sales_amount)/COUNT(DISTINCT order_number)`) vs. line-level (`AVG(sales_amount)`)?
2. Is the "campaign performance = attributed sales only" framing (§1.4) acceptable, given no spend/impression data exists, or should this wait until such data is available?
3. Any objection to the no-customer-names rule (§1.5) for the Sales Trends page?

If there's no response, implementation proceeds with the stated proposals
and keeps 3-6 out of scope as written.
