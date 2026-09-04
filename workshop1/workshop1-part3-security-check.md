# Workshop 1 · Part 3 - Run the Security Check on Dataset

*Let Claude Code act as your Data Security Architect before anything hits BI.*

**[Part 1](./workshop1-part1-prerequisites.md) · [Part 2](./workshop1-part2-connect-data-sources.md) · Part 3**

---

1. Open a PowerShell terminal in VS Code
2. Start Claude Code in auto-permission mode:

   ```bash
   claude.cmd --permission-mode auto
   ```

3. Run the following prompt in the Claude Code CLI:

   ```
   Act as a Data Security Architect. Review the entire dataset folder and identify the key security and governance concerns before the data is used for analytics or reporting.

   Check for:

   * PII, confidential, financial, or sensitive data
   * Exposed credentials, secrets, or unnecessary data
   * Data that should be masked, removed, or restricted
   * Access-control, RLS/CLS, encryption, and audit requirements
   * Risks when moving data through Bronze -> Silver -> Gold -> BI

   Create a concise `security_handover.md` documenting the key findings, risks, recommended controls, priorities, and any open questions. Base everything on the actual datasets; do not invent information.

   ```

4. Copy the generated `security_handover.md` into the `workshop2` folder:

   ```bash
   cp security_handover.md ../workshop2/
   ```

> [!NOTE]
> **Handoff artifact.** `security_handover.md` is the bridge between Workshop 1 and Workshop 2: Workshop 2 assumes it already exists in the `workshop2` folder before it starts.

---

**Workshop 1 complete.** Continue to [Workshop 2](../workshop2/readme.md).
