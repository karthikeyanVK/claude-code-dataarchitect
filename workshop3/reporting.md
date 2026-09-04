# Workshop 3 Part 2 - Analytics Reporting

*Plan a responsive analytics dashboard using the populated Gold schema.*

**[Workshop 3](./readme.md) · [Part 1 - Governance](./governance.md) · Part 2**

## Prerequisites

Complete [Part 1 - Data Governance](./governance.md) first. The Workshop 2 Gold-layer star schema must be populated.

## Workflow

1. Open a terminal in the project 'workshop3' and run `claude`.
2. Enter `/plan` and use the prompt below.

## Prompt

```text
Act as a senior analytics application architect.

Create an implementation plan for a production-ready analytics dashboard in `workshop3/report` using the existing database and Gold schema.

Requirements:

- Use Next.js and TypeScript.
- Use Prisma ORM for database access.
- Create reusable data-access functions and reusable UI components.
- Use only available Gold tables, columns, relationships, and metrics. Do not invent data, business logic, or metrics.
- Read the database connection string from `.env` at runtime or through the documented application configuration. Never hardcode credentials or connection strings.
- Inspect the Gold schema, existing project structure, and governance and lineage documentation before defining pages or metrics.
- Run independent discovery and planning tasks in parallel whenever possible, such as inspecting the Gold tables, reviewing the existing project structure, and checking governance and lineage documentation. Consolidate the results before making implementation decisions, and avoid parallel tasks that modify the same files.
- Include appropriate charts, filters, KPI cards, loading states, empty states, and error handling based on the available Gold data.
- Create two pages:
  1. Sales Trends, showing relevant sales KPIs, trends over time, comparisons, and available business dimensions.
  2. Campaign Analytics, showing available campaign performance KPIs, trends, comparisons, and relevant dimensions.
- Include `.env.example`, `package.json`, and clear local run instructions using `npm run dev`.
- Keep all application files inside `workshop3/report`.
- If a requested metric or relationship is ambiguous, document the ambiguity and ask for clarification instead of making assumptions.

Save the implementation plan as `create_reporting_app.md`. Do not implement the plan and do not run implementation commands in this step.
```

3. Enter `Implement create_reporting_app.md` and press enter to run in the claude code and let it run.
4. Once the implementation is over then navigate to `workshop3/report` folder and run


    ```bash
    npm run dev
    ```

**Previous: [Part 1 - Data Governance](./governance.md)**
