# Workshop 1 · Part 1 - Prerequisites & Validation

*Get your machine ready before touching any data.*

**Part 1 · [Part 2](./workshop1-part2-connect-data-sources.md) · [Part 3](./workshop1-part3-security-check.md)**

---

#### Pre-requisite

1. Install VSCode
2. Open and install SQL Server extension [ms-mssql](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql)
3. Node.js + latest npm
4. Python
5. Claude PRO Subscription
6. Git installed
7. Login into your GitHub account
8. Install [Claude Code CLI](https://docs.claude.com/en/docs/claude-code/setup)

   Open Command Prompt and run:

   ```bash
   winget install Anthropic.ClaudeCode
   ```

---

#### Validation

Run each command in a terminal and confirm you get a version string back, not an error.

| Tool | Command | Expected |
|---|---|---|
| Node.js | ```node -v``` | version string, e.g. `v20.x.x` |
| npm | ```npm -v``` | version string |
| Git | ```git --version``` | version string |
| Claude Code | ```claude --version``` | version string |

```bash
node -v
npm -v
git --version
claude --version
```

Once every check returns a clean version string, move on.

---

**Next: [Part 2 - Connect Your Data Sources](./workshop1-part2-connect-data-sources.md)**
