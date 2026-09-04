# Claude Code Data Architect - Reporting and Governance

1. Open a terminal and run `claude`.
2. Run the following prompt:

```
Act as a **Data Governance Architect**. Review the entire database and focus on:

1. **Metadata & Data Dictionary**: Identify datasets, columns, definitions, data types, sources, owners, and classifications.
2. **Data Lineage**: Check whether lineage already exists. If not, create `data_lineage.md` and update the initial creation scripts so lineage details are captured automatically when datasets/tables are created.
3. **Data Architecture Diagrams**: Create clear data-flow diagrams for the **Bronze, Silver, and Gold** layers, showing datasets and movement between layers.

For database access, get the **database connection string from the `.env` file**. Never hardcode credentials or connection strings.

Create or update `governance_handover.md` with findings, gaps, requirements, diagrams, and recommendations.

Base everything on the actual project and datasets. Do not invent information.
```

3. Close the terminal window.
4. Run the following prompt once:

```
Implement the data_lineage.md
```

5. Close the terminal window.
6. Run the following prompt once:

```
Implement the governance_handover.md
```

7. Close the terminal window.
8. Run the following prompt once to build the analytics dashboard:

```
Build a **production-ready analytics dashboard in Next.js using the Gold schema** from the existing database.

* Get the **database connection string from the `.env` file**. Never hardcode credentials.
* Inspect the Gold schema and use only the available Gold tables, columns, relationships, and metrics. **Do not invent data or business logic.**
* Build a clean, modern, responsive dashboard with reusable components and navigation.

Create two dashboard pages:

### 1. Sales Trends

Use the Gold schema to show relevant sales KPIs, trends over time, comparisons, and available business dimensions with appropriate filters.

### 2. Campaign

Use the Gold schema to show campaign performance, KPIs, trends, comparisons, and relevant dimensions available in the data.

Use the existing Gold-layer definitions and governance/lineage information where available.

Before implementation, inspect the Gold schema and existing project structure. If any requirement or metric is ambiguous, ask for clarification rather than making assumptions.
```

9. Close the terminal window.
10. Update the reports to reflect the lineage and governance changes.
