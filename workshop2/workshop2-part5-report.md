# Workshop 2 Part 5 - Build Reporting Application

*Build a Next.js reporting application from the Gold-layer star schema.*

**[Part 1](./workshop2-part1-bronze-erp-crm.md) · [Part 2](./workshop2-part2-kafka-streaming.md) · [Part 3](./workshop2-part3-silver-layer.md) · [Part 4](./workshop2-part4-star-schema.md) · Part 5**

---

1. Run the below prompt.

   ```
   You are a Data Architect/Data Analyst building a reporting application in Next.js using the existing Gold-layer star schema.

   Requirements

   - Create the reporting application in the `workshop2/report` folder.
   - Create all application source code, configuration files, Prisma files, and package files inside the `workshop2/report` folder.
   - Do not create reporting application files in the `workshop2` root or in the Bronze, Silver, or Gold pipeline folders.
   - Read the database connection string from `.env`.
   - Use the Gold star schema only as the reporting source. Do not query Bronze or Silver.
   - Inspect the actual Gold fact and dimension tables and use only the available columns and measures.
   - Use an ORM for all database access. Do not write raw SQL in the Next.js application.
   - Use Prisma ORM with TypeScript.

   Dashboard

   Create a clean, modern, responsive Next.js reporting application in `workshop2/report` with two pages.

   Sales Trend

   - Show total sales or revenue.
   - Show sales volume.
   - Show sales trends over time.
   - Show sales by product.
   - Show sales by customer or segment where available.
   - Provide date, product, and customer filters.

   Campaign Analytics

   - Show campaign performance.
   - Show sales or revenue attributed to campaigns where available.
   - Provide campaign-wise comparisons.
   - Show campaign trends over time.
   - Show relevant campaign KPIs available in the Gold schema.
   - Provide campaign filters.

   Technical Requirements

   - Use Next.js with TypeScript.
   - Use Prisma ORM for database access.
   - Generate Prisma models from the existing Gold schema.
   - Read the database connection from `.env`.
   - Use reusable Prisma data-access and service functions.
   - Keep database logic separate from UI components.
   - Use appropriate charts, KPI cards, tables, and filters.
   - Calculate metrics using the proper fact-to-dimension relationships from the Gold star schema.
   - Do not invent fields or metrics that do not exist in the Gold schema.
   - Handle nulls and empty results gracefully.
   - Keep the architecture clean and extensible.

   Deliverables

   Create the following:

   - A complete Next.js application in `workshop2/report`.
   - Prisma ORM configuration and schema.
   - A Sales Trend page.
   - A Campaign Analytics page.
   - Reusable dashboard components.
   - A Prisma-based data-access layer.
   - An `.env.example` file.
   - A `package.json` file.
   - Run instructions.

   The application must run with `npm run dev` when executed from the `workshop2/report` folder.

   Create a detailed implementation plan and save it to `create_reporting_app.md`.
   Do not implement the plan and do not ask me for permission to implement it. I will implement it myself.
   ```

2. Enter `/plan` in the Claude Code CLI.
3. Save the generated plan as `create_reporting_app.md`.
4. Once the implementation is over then navigate to `workshop2/report` folder and run

    ```bash
    npm run dev
    ```
---

### Workshop 2 complete.
