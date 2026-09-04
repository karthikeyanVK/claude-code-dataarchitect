# Claude Code Data Architect Workshop

Build a complete analytics platform with Claude Code: connect raw sources, profile and cleanse data, model a warehouse, create a reporting app, and document governance evidence.

This workshop is designed as a guided, end-to-end data architecture build that can be completed in a day.

---

## Outcome

By the end, you will have a working medallion-style data platform with a governed analytics layer.

| 1. Secure | 2. Model | 3. Analyze |
|---|---|---|
| Review raw source data for sensitive fields and risks. | Profile, cleanse, and shape trusted Silver and Gold layers. | Build dashboards, document lineage, and capture governance findings. |

---

## Quick Start

**1. Clone the repository**

```bash
git clone https://github.com/karthikeyanVK/claude-code-dataarchitect
```

**2. Pull the latest version**

```bash
git pull origin main
```

**3. Open the workspace**

```bash
cd claude-code-dataarchitect
code .
```

---

## Workshop Flow

| Module | What you do |
|---|---|
| [Workshop 1 - Setup & Security](./workshop1/readme.md) | Prepare the environment, connect sources, and produce the security handover |
| [Workshop 2 - Medallion Build](./workshop2/readme.md) | Load Bronze, profile data, create Silver rules, copy Kafka events, and build Gold star-schema tables |
| [Workshop 3 - Reporting & Governance](./workshop3/readme.md) | Plan the analytics dashboard first, then document governance, lineage, and handover evidence |
| Workshop 4 - Reset Utility | Optional SQL cleanup utility for workshop reruns |

---

## Workshop 1

Setup, source connection, and security review.

Start with [Workshop 1 - Setup & Security](./workshop1/readme.md).

| Part | What you do |
|---|---|
| [Part 1 - Prerequisites & Validation](./workshop1/workshop1-part1-prerequisites.md) | Install required tools and verify each one |
| [Part 2 - Connect Your Data Sources](./workshop1/workshop1-part2-connect-data-sources.md) | Configure `.env`, connect Blob storage, run SQL setup, and validate Kafka connectivity |
| [Part 3 - Security Check](./workshop1/workshop1-part3-security-check.md) | Review source data for security risks and produce `security_handover.md` |

---

## Workshop 2

Medallion architecture build from Bronze to Gold.

Workshop 1 complete: data sources connected, `security_handover.md` produced.

| Part | What you do |
|---|---|
| [Part 1 - Bronze ERP and CRM](./workshop2/workshop2-part1-bronze-erp-crm.md) | Create Bronze tables and load ERP/CRM source data |
| [Part 2 - Kafka Streaming](./workshop2/workshop2-part2-kafka-streaming.md) | Copy campaign events from Kafka into Bronze |
| [Part 3 - Silver Layer](./workshop2/workshop2-part3-silver-layer.md) | Profile Bronze data, generate YAML rules, and run the generic pipeline |
| [Part 4 - Gold Star Schema](./workshop2/workshop2-part4-star-schema.md) | Build reporting-ready fact and dimension tables |

---

## Workshop 3

Reporting first, then governance and handover documentation.

Workshop 2 complete: Gold-layer star schema populated.

| Part | What you do |
|---|---|
| [Part 1 - Reporting](./workshop3/reporting.md) | Plan and build a Next.js analytics dashboard using the Gold schema |
| [Part 2 - Governance](./workshop3/governance.md) | Review metadata, lineage, architecture, and governance handover evidence |

---

## Repository Map

```text
DataArchitectWorkshop/
|-- readme.md      # overview and workshop navigation
|-- workshop1/     # setup, source connections, security review
|-- workshop2/     # Bronze, Silver, Kafka, and Gold warehouse build
|-- workshop3/     # reporting app, governance, lineage, handover
|-- workshop4/     # optional cleanup/reset scripts
```

---

## Start Here

Begin with [Workshop 1 - Part 1: Prerequisites & Validation](./workshop1/workshop1-part1-prerequisites.md), then follow each workshop page in order.
