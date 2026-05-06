<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md — Claude Operating Rules

This file governs how Claude behaves when operating autonomously or semi-autonomously
in agentic, tool-assisted, or multi-step task contexts.

---

## Core Philosophy

Operate with **near-autonomy** on safe, reversible actions. Pause and confirm before
any destructive or irreversible operation. Prefer native tools over shell commands
whenever a native equivalent exists.

---

## Tool Priority: Native First

**Always prefer native/built-in tools over `bash` for reading and navigation.**

| Task | ✅ Preferred | ❌ Avoid |
|---|---|---|
| List directory contents | `view` tool on a directory path | `bash: ls`, `find`, `tree` |
| Read a file | `view` tool on a file path | `bash: cat`, `head`, `tail`, `less` |
| Check file existence | `view` tool; note error if absent | `bash: test -f`, `ls \| grep` |
| Read structured files (.csv, .xlsx, .docx, .pdf) | Relevant skill + native reader | `bash: cat` on binary files |
| Edit a file | `str_replace` tool | `bash: sed -i`, `awk`, `perl -pi` |
| Create a file | `create_file` tool | `bash: echo > file`, `tee` |

**Bash is permitted for tasks that have no native equivalent**, such as:
- Installing packages (`pip install`, `npm install`)
- Running tests or build steps (`pytest`, `npm run build`)
- Executing compiled programs or scripts
- Network requests inside the container (`curl` to allowed domains)
- Compressing/archiving files (`zip`, `tar`) when producing a deliverable

---

## Autonomy Levels

### ✅ Act Without Asking
Proceed immediately, no confirmation needed:

- Reading any file or directory
- Creating new files in the working directory (`/home/claude`)
- Installing packages or dependencies
- Running non-destructive scripts (tests, builds, linters)
- Making edits via `str_replace` to files Claude itself created
- Copying files to `/mnt/user-data/outputs/` for delivery

### ⚠️ Pause and Confirm
Stop and explicitly ask the user before proceeding:

- **`rm`** — deleting any file or directory
- **`mv`** — moving or renaming files (especially user-uploaded or output files)
- **`chmod` / `chown`** — permission changes
- Overwriting an existing file that Claude did **not** create in the current session
- Any operation that modifies files outside `/home/claude` (e.g., editing `/mnt/user-data/uploads/`)
- Running a script whose effects Claude cannot fully preview or reverse
- Making external API calls beyond what the current task obviously requires

**Confirmation format:**
> "I'm about to [describe action] on [file/path]. This cannot be undone easily — shall I proceed?"

---

## Navigation Rules

- **Never use `bash` to navigate the filesystem** (`cd`, `ls`, `find`, `du`, `stat`).
- Use the `view` tool with a directory path to list contents.
- Use the `view` tool with a file path (and optional `view_range`) to read files.
- If a path is unknown, reason from context (uploaded files are at `/mnt/user-data/uploads/`, outputs go to `/mnt/user-data/outputs/`, working space is `/home/claude`).

```
# ❌ Wrong
bash: ls /home/claude/project
bash: cat /home/claude/project/main.py

# ✅ Right
view: /home/claude/project          # lists directory
view: /home/claude/project/main.py  # reads file
```

---

## File Read Strategy

Before reading a file, check the `<available_skills>` block for a relevant skill.
Structured/binary formats require the appropriate skill or tool:

| Extension | Strategy |
|---|---|
| `.txt`, `.md`, `.json`, `.yaml`, `.toml`, `.env`, `.py`, `.js`, `.ts`, etc. | `view` tool directly |
| `.pdf` | `pdf-reading` skill → `bash` with `pdftotext` or page rasterization |
| `.docx` | `docx` skill → `bash` with `python-docx` |
| `.xlsx`, `.csv` | `xlsx` skill or `view` + `bash` with `openpyxl`/`pandas` |
| Images (`.png`, `.jpg`, etc.) | `view` tool (renders inline) |
| Unknown binary | `view` tool first; fall back to `bash: file <path>` to identify type |

---

## Skill Check (Mandatory Before File Creation)

Before writing **any** code that produces a file output, check `<available_skills>` and
`view` every plausibly relevant `SKILL.md`. This is non-negotiable — skills encode
environment constraints not present in training data.

---

## Output Delivery

- All final deliverables must be copied to `/mnt/user-data/outputs/`.
- Call `present_files` with the output path(s) after copying.
- Intermediate/scratch files stay in `/home/claude` and are not presented.

---

## Error Handling

- If a `view` call fails (file not found), **do not fall back to bash to locate it**.
  Instead, tell the user the path wasn't found and ask for clarification.
- If a `str_replace` fails (string not unique or not found), re-`view` the file
  before retrying — earlier view output is stale after any edit.
- Wrap all `bash` calls that could fail in appropriate error handling; surface
  errors clearly rather than silently continuing.

---

## Summary Decision Tree

```
Need to read or list something?
  → Use view tool.  Never use bash for this.

Need to edit a file?
  → str_replace for targeted edits.
  → create_file for new files.
  → bash only if bulk-generating many files programmatically.

Need to delete or move something?
  → STOP. Ask the user first. Always.

Everything else (install, build, run, compress)?
  → bash is fine. Proceed autonomously.
```
