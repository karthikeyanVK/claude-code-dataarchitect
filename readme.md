# Claude Code Data Architect Workshop

Learn to use AI effectively across your data architecture work: assessing sources, profiling and pulling data, spotting patterns and anomalies, discovering rules, cleansing, designing warehouse models, and reporting. Build, validate, and document a full data platform in a day instead of weeks.

Run the three modules below in order over the day.

---

## What You'll Build

Full data platform, one day, AI-driven:

**Security review of raw sources** → **profiled / cleansed / modeled warehouse** (star schema) → **governed, documented, dashboarded analytics layer**.

---

## Getting Started

**1. Clone the repo**

```bash
git clone https://github.com/karthikeyanVK/claude-code-dataarchitect
```

**2. Get latest changes**

```bash
git pull origin main
```

**3. Open the project in VS Code**

```bash
cd content
code .
```

---

## Modules

| Module | What you do |
|---|---|
| [Workshop 1](./workshop1/readme.md) | Setup, connect your data sources, run an AI-driven security review of the data |
| [Workshop 2](./workshop2/readme.md) | AI-driven profiling, pattern and rule discovery, transformations, warehouse and star-schema design |
| [Workshop 3](./workshop3/readme.md) | Governance, lineage, and an AI-built analytics dashboard on top of the modeled data |

---

## Workshop 1 - Navigate the Parts

### Prerequisites

See [Prerequisites & Validation](./workshop1/workshop1-part1-prerequisites.md) in Workshop 1.

### Repo Structure

```
DataArchitectWorkshop/
├── readme.md      # this file, overview, setup, module index
├── workshop1/     # setup, data source connections, security review
├── workshop2/     # profiling, rule discovery, warehouse/star-schema design
└── workshop3/     # governance, lineage, analytics dashboard
```

---

## Workshop 2 - Navigate the Parts

### Prerequisites

Workshop 1 complete: data sources connected, `security_handover.md` produced.

### Parts

1. **Bronze setup** - run `ddl_bronze.sql` and `loadbronze.sql` in the SQL Server extension.
2. **Silver layer build** - AI-driven prompt inspects Bronze data, generates one YAML per table (`template.yaml` structure), plus a generic TypeScript/Node.js runner (`npm run load`).
3. **Kafka copy** - `node consume_campaign_events.js` copies streaming Bronze data.
4. **Gold layer / star schema** - AI-driven prompt builds `gold_fact_sales`, `gold_dim_customer`, `gold_dim_product` from Silver data.

See [workshop2/readme.md](./workshop2/readme.md) for full prompts and naming conventions.

---

## Workshop 3 - Navigate the Parts

### Prerequisites

Workshop 2 complete: Gold-layer star schema populated.

### Parts

1. **Governance review** - AI-driven prompt covers metadata/data dictionary, data lineage, and Bronze/Silver/Gold architecture diagrams; produces `governance_handover.md` and `data_lineage.md`.
2. **Implement lineage and governance** - apply the two handover docs to the project.
3. **Analytics dashboard** - AI-driven prompt builds a Next.js dashboard on the Gold schema, with Sales Trends and Campaign pages.

See [workshop3/readme.md](./workshop3/readme.md) for full prompts.
