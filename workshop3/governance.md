# Workshop 3 Part 1 - Data Governance

*Review metadata, lineage, and architecture across the Bronze, Silver, and Gold layers.*

**[Workshop 3](./readme.md) · Part 1 · [Part 2 - Reporting](./reporting.md)**

## Workflow

1. Open a terminal in the project root and run `claude`.
2. Enter `/plan` and use the prompt below.
3. Save the generated implementation plan as `create_governance.md`.
4. Do not implement the plan in this step. The plan will be implemented separately after it has been reviewed.

## Prompt

```text
Act as a Data Governance Architect for this data platform.

Review the actual project, database, scripts, schemas, datasets, and existing documentation. Use only facts found in the project and database. Do not invent datasets, columns, owners, classifications, lineage, business rules, or recommendations that are not supported by evidence.

Focus on:

1. Metadata and data dictionary
   - Identify datasets and tables.
   - Document columns, definitions, data types, sources, owners when available, and data classifications when supported by the project.
   - Record unknown or missing information as a gap instead of guessing.

2. Data lineage
   - Trace movement and transformations from source data through Bronze, Silver, and Gold.
   - Check whether lineage documentation already exists.
   - Define the evidence and changes needed for data lineage tracking.
   - Produce `data_lineage.md` as a documented deliverable in the implementation plan.

3. Data architecture diagrams
   - Describe clear data-flow diagrams for the Bronze, Silver, and Gold layers.
   - Show the actual datasets, tables, scripts, and movement between layers.
   - Include Mermaid diagrams when the available project evidence supports them.

4. Governance handover
   - Produce `governance_handover.md` as a documented deliverable in the implementation plan.
   - Include findings, gaps, requirements, diagrams, risks, and evidence-based recommendations.

For database access, read the connection string from the `.env` file. Never hardcode credentials or connection strings. Do not expose secrets in generated documentation.

Inspect the existing project structure and Gold schema before making recommendations. Keep the implementation plan separate from implementation work.
```

**Next: [Part 2 - Reporting](./reporting.md)**
