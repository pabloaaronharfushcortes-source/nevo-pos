# 🧠 MASTER KNOWLEDGE FILE
## Nate Herk — *Build & Sell with Claude Code* (10+ Hour Course)
**Source:** https://www.youtube.com/watch?v=mpALXah_PBg  
**Channel:** Nate Herk | AI Automation  
**Published:** March 12, 2026  
**Compiled by:** Knowledge Architect (Claude)  
**Version:** 1.0

---

## ⚡ SYSTEM PROMPT BLOCK
> Paste the block below at the top of any new Claude chat to instantly activate full operational knowledge of Nate Herk's methodology.

```
You are an expert AI automation architect trained on Nate Herk's complete "Build & Sell with Claude Code" methodology. You operate using the WAT Framework (Workflows / Agent / Tools), CLAUDE.md system prompts, Skills, Sub-agents, and Agent Teams. You build automations without writing a single line of code by directing Claude Code. When helping users build workflows, always start with Plan Mode before execution. When helping users price work, apply value-based pricing against ROI, not hourly rates. When helping users find clients, lead with visibility and inbound before cold outreach. You know the full technical stack: Claude Code + n8n + Modal + MCP servers + RAG + GitHub + Browser Automation. You are also a business operator who understands that the goal is not just to build — it is to ship, sell, and retain clients at premium prices.
```

---

## 📌 CORE THESIS

Claude Code is not just a coding tool — it is a general-purpose **AI operating system** for building and selling automated workflows to businesses, without writing code. The method combines technical skill (building agentic workflows) with business skill (finding clients, pricing on ROI, delivering projects) to create a self-sustaining income engine.

---

## 📚 TABLE OF CONTENTS

1. [Why Learn This — The Opportunity](#1-why-learn-this--the-opportunity)
2. [Getting Set Up](#2-getting-set-up)
3. [Operations — How Claude Code Works](#3-operations--how-claude-code-works)
4. [Tokens & Context Windows](#4-tokens--context-windows)
5. [CLAUDE.md — The Brain](#5-claudemd--the-brain)
6. [The WAT Framework](#6-the-wat-framework)
7. [Building Workflows](#7-building-workflows)
8. [Deploying Automations](#8-deploying-automations)
9. [Project Architecture & Commands](#9-project-architecture--commands)
10. [RAG — Retrieval-Augmented Generation](#10-rag--retrieval-augmented-generation)
11. [Turning n8n Workflows into Apps](#11-turning-n8n-workflows-into-apps)
12. [Website Building Hacks](#12-website-building-hacks)
13. [APIs & MCPs](#13-apis--mcps)
14. [Building Your Own Executive Assistant](#14-building-your-own-executive-assistant)
15. [Skills](#15-skills)
16. [Sub-Agents](#16-sub-agents)
17. [Agent Teams](#17-agent-teams)
18. [Browser Automation](#18-browser-automation)
19. [Permissions & Context Management](#19-permissions--context-management)
20. [GitHub & Worktrees](#20-github--worktrees)
21. [The Selling AI Mindset](#21-the-selling-ai-mindset)
22. [Finding Clients](#22-finding-clients)
23. [First Client in 7 Days](#23-first-client-in-7-days)
24. [Pricing AI Workflows](#24-pricing-ai-workflows)
25. [Delivering AI Projects](#25-delivering-ai-projects)
26. [Master Frameworks & Mental Models](#26-master-frameworks--mental-models)
27. [Rules & Mechanisms](#27-rules--mechanisms)
28. [Key Principles](#28-key-principles)
29. [Interconnections](#29-interconnections)
30. [Skill Extraction — Buildable Skills from This Course](#30-skill-extraction--buildable-skills-from-this-course)
31. [Claude Behavioral Instructions](#31-claude-behavioral-instructions)

---

## 1. WHY LEARN THIS — THE OPPORTUNITY

### The Macro Thesis
- Businesses that do not adopt AI will struggle to compete. The question is not *if* but *when* they automate.
- Claude Code sits at the intersection of **natural language** and **code execution** — it makes anyone a builder, not just developers.
- The opportunity is **not** in building complex AGI. It is in solving annoying, repetitive business problems with simple automations.

### The Paradox of "Cool vs. Annoying"
> **"Stop building the cool automation. Build the annoying one."**

- Clients pay for automations that eliminate pain, not for impressive demos.
- A boring outreach writer that saves $400/month is more valuable to a client than a flashy AI agent that impresses no one.
- The biggest ROI automations are often the most unsexy ones: email routing, data entry, scheduling, report generation.

### The Inbound Flywheel
Nate's first client came from **posting his builds publicly** on YouTube — not from cold outreach. Visibility creates inbound leads. Inbound closes faster and at higher prices than cold.

---

## 2. GETTING SET UP

### Required Stack
| Component | Purpose |
|---|---|
| Claude Pro or Team Plan | Required for Claude Code access |
| VS Code (or Antigravity IDE) | Local development environment |
| Claude Code Extension | Chat interface + file manipulation inside IDE |
| Node.js | Required runtime for Claude Code |
| `.env` file | Secure storage for API keys (never in code files) |
| GitHub | Version control, worktrees, collaboration |

### IDE Layout (VS Code)
- **Left Panel (Explorer):** File structure — `/workflows`, `/tools`, `/prompts`, `CLAUDE.md`
- **Right Panel (Agent):** Chat interface with Claude Code for planning and execution

### Key Setting: Bypass Permissions
- Enable "Bypass Permissions" in Claude Code settings for faster builds
- Allows the agent to edit files without asking approval on every step
- **Only enable this in trusted project environments**

### Account Setup Flow
1. Install Claude Code extension in VS Code
2. Sign in with Anthropic account
3. Create project folder → open in VS Code
4. Create `CLAUDE.md` (system prompt) immediately
5. Build folder structure: `/workflows`, `/tools`, `/prompts`

---

## 3. OPERATIONS — HOW CLAUDE CODE WORKS

### What Claude Code Actually Is
Claude Code is a **terminal-embedded agentic loop** — it reads files, writes files, runs commands, and calls APIs, all from natural language instructions. It operates inside your local development environment (not in the cloud) giving you full control over secrets and data.

### The Agentic Loop Mental Model
```
USER GOAL
    ↓
Claude Plans (Plan Mode)
    ↓
Claude Executes (reads/writes files, runs scripts)
    ↓
Claude Self-Heals (reads errors, refactors, retries)
    ↓
Output Delivered
```

### Agentic vs. Step-by-Step: The Restaurant Analogy
| Step-by-Step Workflow | Agentic Workflow |
|---|---|
| Like following a recipe at home | Like ordering at a restaurant |
| You specify every step | You specify the outcome |
| Breaks if you miss a step | Agent figures out the steps |
| Deterministic | Probabilistic + self-correcting |

> Agentic workflows still ask clarifying questions — a great chef asks how you want your steak done. The agent will ask the questions needed to deliver exactly what you need.

### Probabilistic vs. Deterministic Separation
- **AI (Claude)** = probabilistic — great at reasoning, planning, decision-making
- **Code (Python tools)** = deterministic — great at precise execution, API calls, data manipulation
- The WAT Framework exploits this separation by keeping reasoning in markdown and execution in Python

---

## 4. TOKENS & CONTEXT WINDOWS

### Core Concept
- Every message to Claude Code consumes **tokens** (input + output)
- Claude Code uses a **200k token context window**
- The context window holds: system prompt, conversation history, file contents, skill metadata, tool outputs

### Token Consumption Breakdown (Approximate)
| Component | Token Cost |
|---|---|
| System prompt (CLAUDE.md) | ~2,000 tokens |
| Each Skill metadata block | ~40–100 tokens |
| Full SKILL.md content (when triggered) | ~2,000–5,000 tokens |
| Conversation history | 3,000+ tokens (grows) |
| Tool output (script result) | Variable |

### Context Management Rules
1. **Use `/compact`** to compress conversation history when context gets long
2. **Use `/clear`** to start fresh context when switching tasks
3. **Use progressive loading** — load only the files actually needed for the current task
4. **Store secrets in `.env`** — never in context
5. **Skills load on-demand** — metadata loads first (~100 tokens), full body only when triggered
6. **`/btw` command** — ask side questions in a separate context thread (can reduce token spend by up to 50% in long sessions)

### Anti-Patterns to Avoid
- Loading entire codebases into context unnecessarily
- Re-explaining context already defined in CLAUDE.md
- Keeping long irrelevant conversation history active
- Storing API keys in files (they'll enter context and get exposed)

---

## 5. CLAUDE.md — THE BRAIN

### What It Is
`CLAUDE.md` is a **markdown file that acts as the persistent system prompt** for Claude Code. It is the AI's "operating manual" for your project. Everything Claude should always know about your project lives here.

### Hierarchy of CLAUDE.md Files
| Location | Scope |
|---|---|
| `~/.claude/CLAUDE.md` | Global — applies to ALL projects |
| `[project]/.claude/CLAUDE.md` | Project-level — overrides global |
| Sub-folder `CLAUDE.md` | Sub-folder scope |

### What to Put in CLAUDE.md
```markdown
# Project Name

## Role & Persona
[Tell Claude what role it plays in this project]

## Folder Structure
- /workflows — SOP markdown files
- /tools — Python execution scripts  
- /prompts — Reusable prompt templates
- .env — API keys (never read directly)

## Core Rules
1. Always enter Plan Mode before building
2. Never store API keys in tool files
3. Read errors and self-heal before asking for help
4. Update workflow files if a process is improved

## WAT Framework Instructions
[Explain how to use Workflows → Agent → Tools]

## Active MCP Servers
[List connected MCPs]

## Project-Specific Context
[Any domain knowledge Claude needs]
```

### CLAUDE.md as Memory
- Eliminates the need to re-explain context in every session
- Acts as persistent memory across conversations
- Team members share one CLAUDE.md = shared AI brain
- Can be version-controlled in GitHub

### Self-Healing Instruction Pattern
Include this in every CLAUDE.md:
> *"If a tool returns an error, read the error message, identify the cause, refactor the tool, update the workflow if needed, and retry before asking the user for help."*

---

## 6. THE WAT FRAMEWORK

> The core framework Nate uses to build every automation. WAT = **W**orkflows / **A**gent / **T**ools

### Visual Architecture
```
┌─────────────────────────────────────┐
│         CLAUDE.md (Agent Brain)     │
│  Tells Claude how to use the layers │
└──────────────┬──────────────────────┘
               │
    ┌──────────▼──────────┐
    │  LAYER 1: WORKFLOWS  │  ← The "What" (SOPs)
    │   /workflows/*.md    │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   LAYER 2: AGENT    │  ← The "How" (Reasoning)
    │    Claude Code       │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │   LAYER 3: TOOLS    │  ← The "Execution" (Code)
    │    /tools/*.py       │
    └─────────────────────┘
```

### Layer 1: Workflows (`/workflows/*.md`)
- **Format:** Plain markdown (`.md`) files
- **Purpose:** SOPs (Standard Operating Procedures) for the AI
- **Contents per workflow file:**
  - Objective
  - Required inputs
  - Sequence of tool calls
  - Edge case handling instructions
  - Expected outputs
- **Analogy:** The manager giving step-by-step instructions to the worker

### Layer 2: Agent (`CLAUDE.md`)
- **Format:** Markdown system prompt
- **Purpose:** Tells Claude how to navigate the folder structure, which tools to call, how to handle errors, and how to follow the WAT framework
- **Key instruction:** "Read the relevant workflow file before executing any task"

### Layer 3: Tools (`/tools/*.py`)
- **Format:** Python scripts
- **Purpose:** Deterministic code execution — API calls, web scraping, data manipulation, file writing
- **Rule:** API keys and secrets are NEVER stored in tool files. They are read from `.env`
- **Self-healing:** If a tool fails, Claude reads the error and rewrites the tool

### Why WAT Works
| Problem | WAT Solution |
|---|---|
| AI hallucinates steps | Workflows define exact steps |
| AI forgets instructions | CLAUDE.md persists instructions |
| AI can't execute code reliably | Python tools are deterministic |
| AI can't recover from errors | Self-healing instruction in CLAUDE.md |
| Hard to maintain | Each layer is independently editable |

---

## 7. BUILDING WORKFLOWS

### The Build Process (Step-by-Step)
1. **Brain Dump** — Tell Claude your goal in plain English in Plan Mode
2. **Iterative Questioning** — Claude asks clarifying questions (frequency, data points, outputs, edge cases)
3. **Plan Approval** — Review the to-do list Claude generates before execution
4. **Execution** — Claude creates folders, writes workflow .md files, writes Python tools, tests
5. **Iteration** — Test the output, identify failures, ask Claude to self-heal

### Plan Mode Protocol
- ALWAYS use Plan Mode before execution
- Plan Mode prevents Claude from writing bad code that's hard to undo
- Use "think step by step" language in your prompts
- Ask Claude to list every assumption before starting

### First Workflow Example: YouTube Channel Scraper + Branded Slide Deck
- **Goal:** Scrape YouTube channels in AI niche, extract data, create branded slide deck
- **Workflow file:** Defines objective, channels to scrape, data points, slide format
- **Tool:** Python script using YouTube Data API
- **Agent:** Orchestrates the scraper, formats data, calls presentation tool
- **Output:** `.pptx` file delivered automatically

### Second Workflow Example: Personalized Outreach Writer
- **Goal:** Research a person + their company, generate personalized cold outreach
- **Tool:** Web scraper + LLM API call
- **ROI framing:** Saved a client ~$400/month at $50/hr for manual outreach
- **Lesson:** Small, annoying automation = high perceived value

### Screenshot Feedback Loop (Website Building)
- Take a screenshot of the current state of a website
- Feed the screenshot to Claude Code with instructions: "Make it look like X"
- Claude reads the screenshot and edits the code
- Repeat until perfect
- **This eliminates the need to explain every CSS rule manually**

---

## 8. DEPLOYING AUTOMATIONS

### Deployment Options
| Platform | Best For | Cost |
|---|---|---|
| **Modal** | Python workflows, serverless execution | Pay-per-use |
| **VPS (Hostinger)** | 24/7 always-on automations, n8n self-hosting | ~$10–30/mo |
| **Vercel / Netlify** | Static websites, frontend apps | Free tier |
| **GitHub Pages** | Simple static sites | Free |
| **Cloudflare Workers** | Edge deployments | Free tier |

### Modal Deployment Flow
1. Install Modal CLI
2. Convert your Python tool to a Modal function
3. Set secrets as Modal Secrets (never in code)
4. Run `modal deploy`
5. Monitor logs for errors
6. Schedule with `modal.Cron`

### Pre-Deployment Security Checklist
- [ ] No API keys in code files
- [ ] All secrets in `.env` or Modal Secrets
- [ ] No exposed webhooks without authentication
- [ ] Rate limiting on any public-facing endpoints
- [ ] Error handling that doesn't expose internal stack traces

### VPS Deployment for n8n (24/7)
- Self-hosting n8n on a VPS gives you full control and avoids n8n cloud costs at scale
- Nate uses Hostinger VPS (code `NATEHERK` for 10% off annual plan)
- Workflow: Docker + n8n on VPS = production-ready automation

---

## 9. PROJECT ARCHITECTURE & COMMANDS

### Recommended Project Folder Structure
```
project/
├── CLAUDE.md              ← Agent brain / system prompt
├── .env                   ← API keys (gitignored)
├── .gitignore             ← Ignore .env, __pycache__, etc.
├── /workflows             ← Markdown SOPs
│   ├── main_workflow.md
│   └── edge_case_handler.md
├── /tools                 ← Python execution scripts
│   ├── scraper.py
│   ├── email_sender.py
│   └── data_formatter.py
├── /prompts               ← Reusable LLM prompt templates
│   └── outreach_prompt.md
└── /skills                ← Custom Claude skills
    └── my_skill/
        └── SKILL.md
```

### Key Commands
| Command | Action |
|---|---|
| `/compact` | Compress conversation history to save tokens |
| `/clear` | Start fresh context window |
| `/btw [question]` | Ask side question without polluting main context |
| `/resume` | Resume a previous conversation |
| `!` prefix | Run a bash command directly in terminal |
| `Shift + ?` | Show all available shortcuts |

### Slash Commands (Custom)
- Create a `.md` file in `.claude/commands/` with the command name
- Example: `deploy.md` creates `/deploy` command
- Command files contain markdown instructions Claude follows when invoked
- **Note:** In modern Claude Code, custom commands are merged with Skills

---

## 10. RAG — RETRIEVAL-AUGMENTED GENERATION

### What RAG Is
RAG = **R**etrieval-**A**ugmented **G**eneration. Instead of asking an AI a question and hoping it knows the answer, you:
1. Store your documents/data in a **vector database**
2. When a query arrives, retrieve the most relevant chunks
3. Pass those chunks + the query to the LLM
4. LLM generates a response grounded in your actual data

### RAG Architecture
```
DOCUMENTS (PDF, TXT, URLs)
    ↓
CHUNKING (split into pieces)
    ↓
EMBEDDING (convert to vectors)
    ↓
VECTOR DATABASE (Pinecone, Supabase, etc.)
    ↓
QUERY → SIMILARITY SEARCH → RELEVANT CHUNKS
    ↓
LLM (Claude) → GROUNDED RESPONSE
```

### Why RAG Matters for Client Work
- Clients have proprietary data (manuals, FAQs, policies, CRM data)
- RAG lets you build AI agents that "know" the client's business
- **Example:** Customer support bot trained on company policy docs
- **Eliminates:** Hallucination on company-specific information

### RAG Build in n8n (3-step)
1. **Ingestion workflow:** Load doc → chunk → embed → store in Pinecone
2. **Query workflow:** User question → embed → similarity search → retrieve chunks → send to Claude
3. **Action workflow:** Claude generates response → trigger action (send email, update CRM)

### Vector Database Options
| Tool | Nate's Use Case |
|---|---|
| Pinecone | Cloud-hosted, easy setup for client projects |
| Supabase | Open source, self-hostable, good for VPS |
| Qdrant | High performance, self-hostable |

---

## 11. TURNING n8n WORKFLOWS INTO APPS

### The Pattern
Convert an n8n automation into a full web app with a UI using Claude Code:
1. Build the n8n workflow (the backend logic)
2. Use Claude Code to build a frontend (HTML/React)
3. Connect frontend to n8n via **webhooks**
4. Deploy frontend on Vercel/Netlify
5. Result: a client-facing app backed by n8n automation

### Why This Matters Commercially
- A raw n8n workflow is a "black box" to clients
- A web app interface makes it feel like a **product**
- You can charge 3–5x more for the same underlying automation when it has a UI
- **"Wrap the automation in a product"** is a core monetization strategy

### Screenshot-to-App Workflow
1. Find a design inspiration (Dribbble, Figma community)
2. Screenshot the design
3. Paste screenshot into Claude Code: "Build this but for [client use case]"
4. Claude Code builds the HTML/CSS/JS
5. Connect to n8n webhook as backend
6. Deploy

---

## 12. WEBSITE BUILDING HACKS

### The No-Code Website Stack
- **Claude Code** for frontend generation (HTML, CSS, JS, React)
- **GitHub** for version control
- **Vercel** for instant deployment
- **n8n** for any backend automation

### 5 Hacks for Professional Websites
1. **Screenshot → Build:** Paste design inspiration screenshot, Claude replicates it
2. **Component Libraries:** Reference open-source component libraries in your prompt
3. **Voice Dump → Design:** Record a voice note describing what you want, transcribe it, dump into Claude Code
4. **3D Animated Websites:** Use Three.js via Claude Code for premium visual effects (sells at higher prices)
5. **Iterative Feedback Loop:** Screenshot current state → tell Claude what's wrong → fix → repeat

### 3D Animated Websites
- Use Three.js library (Claude Code knows it well)
- Premium visual effect that justifies higher project prices
- Client perception: "This must be expensive to build" — even though Claude built it in hours
- Best for: SaaS landing pages, portfolio sites, luxury brands

---

## 13. APIs & MCPs

### What is an API?
An API (Application Programming Interface) is a way for one software system to talk to another. Claude Code can call any API through Python tool scripts.

### What is an MCP?
**MCP = Model Context Protocol** — Anthropic's standard for connecting AI agents to external services. Think of it as an **"App Store" for AI tools**.

### MCP vs. Direct API Integration
| MCP | Direct API |
|---|---|
| Plug-and-play, no code needed | Requires writing integration code |
| Universal standard | Tool-specific |
| Claude knows how to use it natively | Must explain the API to Claude |
| Faster to set up | More control/flexibility |

### Key MCP Servers Nate Uses
| MCP Server | What It Connects |
|---|---|
| Gmail MCP | Read, write, send emails |
| Google Calendar MCP | Events, scheduling |
| Slack MCP | Messages, channels |
| GitHub MCP | Repos, issues, PRs |
| Google Drive MCP | Files, documents |
| Playwright MCP | Browser automation |
| n8n MCP | See and build n8n workflows |

### MCP Setup Pattern
1. Find MCP server (mcp.so, GitHub, Anthropic docs)
2. Add to Claude Code settings: `claude mcp add [server-name] [connection-string]`
3. Verify in CLAUDE.md: list active MCPs
4. Claude can now call that service directly in conversations

### Google CLI Integration
- Google Cloud CLI lets Claude Code interact with Google's entire ecosystem
- Useful for: BigQuery, Cloud Run, Google Workspace, Gmail API
- Setup: Install `gcloud` CLI → authenticate → Claude Code can use all Google services

---

## 14. BUILDING YOUR OWN EXECUTIVE ASSISTANT

### The AI OS Concept
Nate's personal AI Operating System runs Claude Code as a 24/7 executive assistant that:
- Manages inbox (classifies, drafts, sends emails)
- Manages calendar (schedules meetings, creates events)
- Monitors tasks (tracks to-do lists, follows up)
- Generates reports (weekly summaries, analytics)
- Creates content (drafts posts, scripts, outlines)

### Architecture of an Executive Assistant Agent
```
User (voice or text input)
    ↓
Claude Code (orchestrator)
    ↓
MCP Servers: Gmail, Calendar, Notion, Slack
    ↓
Skills: Email writer, Report generator, Content creator
    ↓
Sub-agents: Specialized for each domain
    ↓
Output: Emails sent, events created, tasks completed
```

### The AI OS Business Offer (2026)
- **Sell one-on-one hours** helping business owners set up their own AI OS
- This is the **entry-level offer** before selling larger retainer projects
- Lower barrier than pitching a full automation project
- Creates trust + understanding of the client's workflows
- Natural upsell path to full automation builds

---

## 15. SKILLS

### What a Skill Is
A **Skill** is a reusable, modular capability for Claude — written once, stored as a file, triggered automatically when needed. Skills are the equivalent of SOPs for AI agents.

### Skill Anatomy
```
.claude/skills/[skill-name]/
├── SKILL.md        ← Core instructions (required)
└── [support files] ← Templates, schemas, scripts (optional)
```

**SKILL.md structure:**
```markdown
---
name: skill-name
description: One sentence describing when to use this skill (triggers matching)
allowed-tools: [Read, Write, Bash]  # optional permission control
---

# Skill Instructions

Step 1: [What Claude does]
Step 2: [What Claude does]
Step 3: [What Claude does]

## Edge Cases
[How to handle failures]

## Output Format
[What the output should look like]
```

### Progressive Loading (How Skills Save Tokens)
1. **All sessions:** Only skill name + description loaded (~40–100 tokens each)
2. **When triggered:** Full SKILL.md loaded (2,000–5,000 tokens)
3. **When needed:** Support files loaded on-demand (0 tokens until needed)
4. **Scripts:** Executed via bash — only the *output* enters context, not the code

### Two Types of Skills
| Type | Purpose | Example |
|---|---|---|
| **Capability Uplift** | Gives Claude abilities it lacks natively | Document creator, web scraper, PDF filler |
| **Encoded Preference** | Guides Claude on your team's specific way of doing known tasks | NDA review format, weekly update template, email tone |

### Skill Invocation
- **Auto-triggered:** Claude detects the task matches a skill description (semantic similarity)
- **Manual:** User types `/skill-name` in Claude Code
- **Context fork:** Skill can spin up a sub-agent in isolated context

### How Skills Improve Over Time
- Add a `learnings.md` file to your skill directory
- After each session, instruct Claude to append what worked and what failed
- A "wrap-up skill" can run at the end of every session to capture learnings automatically
- Over time: skills become more accurate, edge cases get handled, the AI gets smarter

### Skill vs. CLAUDE.md vs. Custom Command
| Feature | CLAUDE.md | Skill | Custom Command |
|---|---|---|---|
| Scope | Always loaded | On-demand | On-demand |
| Best for | Persistent context | Reusable capabilities | Single task recipes |
| Location | Root of project | `.claude/skills/` | `.claude/commands/` |
| Format | Markdown | YAML + Markdown | Markdown |

---

## 16. SUB-AGENTS

### What a Sub-Agent Is
A **Sub-agent** is a specialized Claude instance with:
- Its own **system prompt** (separate from the main agent)
- Its own **tool permissions** (can be more restricted than parent)
- Its own **context window** (isolated from parent context)
- Defined in a `.md` file in `.claude/agents/`

### Sub-Agent vs. Skill
| Sub-Agent | Skill |
|---|---|
| Has its own context window | Runs in the main context |
| Self-contained specialist | Reference material/instructions |
| Reports results back to parent | Inline capability augmentation |
| Like a specialized employee | Like training material |
| Better for independent workflows | Better for reusable instructions |

### Sub-Agent File Structure
```
.claude/agents/
└── code-reviewer.md
```

```markdown
---
name: code-reviewer
description: Reviews code for bugs, style issues, and security vulnerabilities. Use when asked to audit, review, or assess code quality.
model: claude-sonnet-4-6
allowed-tools: [Read, Grep, Glob]  # no Write permission
---

You are a senior code reviewer. When reviewing code:
1. Check for security vulnerabilities first
2. Check for logic errors
3. Check for style and readability issues
4. Output a numbered list of issues with severity ratings
```

### When to Use Sub-Agents
- Task requires **specialized expertise** that should be isolated
- Task needs **different tool permissions** than the main agent
- Task is **long-running** and shouldn't block the main conversation
- Task outputs need to be **reviewed before integration** (human-in-the-loop)

### Sub-Agent Execution Pattern
```
Main Agent (orchestrator)
    ↓ spawns
Sub-Agent (e.g., code-reviewer)
    ↓ executes task in isolated context
    ↓ returns result to Main Agent
Main Agent integrates result
```

---

## 17. AGENT TEAMS

### What Agent Teams Are
**Agent Teams** are Claude's multi-agent orchestration system with **peer-to-peer communication** — agents can talk to each other directly, not just report to a parent.

### Architecture: Subagents vs. Teams
| Subagents | Agent Teams |
|---|---|
| Parent → Child hierarchy | Peer-to-peer mailbox system |
| Child reports back to parent | Agents communicate directly with each other |
| Sequential by default | Can work in parallel |
| Simple task delegation | Complex collaborative workflows |

### How Agent Teams Communicate
- Each agent has a **mailbox** — a shared task list + message queue
- A **team lead** (orchestrator) spawns teammates and manages sequencing
- **Teammates** can send messages directly to each other without routing through the lead
- Example: Frontend agent tells backend agent about API contract changes directly

### Agent Teams Use Cases
| Use Case | How Teams Help |
|---|---|
| Full-stack development | Frontend agent + backend agent + test agent work in parallel |
| Content pipeline | Research agent + writer agent + editor agent + publisher agent |
| Client onboarding | Data collector + CRM updater + welcome email agent |
| Reporting | Data puller + analyzer + formatter + sender |

### Cost Warning
- Agent Teams are the **most expensive** orchestration mode
- Every inter-agent message = token cost
- Every parallel agent session = parallel token billing
- **Rule:** Use Agent Teams only when parallelism genuinely saves time; use Sub-agents for simpler hierarchical tasks

---

## 18. BROWSER AUTOMATION

### The Playwright MCP
Playwright MCP gives Claude Code full browser automation capabilities:
- Navigate to URLs
- Click elements
- Fill forms
- Extract data
- Take screenshots
- Handle JavaScript-rendered pages

### Browser Automation Setup
1. Find Playwright MCP on GitHub
2. Add to Claude Code: `claude mcp add playwright-mcp`
3. Claude Code can now control a browser like a human

### Use Cases
| Use Case | Automation Value |
|---|---|
| Web scraping (JS-heavy sites) | Extract data from sites that block regular scrapers |
| Form submission | Automate lead generation, job applications |
| Testing | QA automation for web apps |
| Monitoring | Alert when website content changes |
| Content generation | Auto-post to platforms with no API |

### Key Warning: Permissions
- Always set granular **tool permissions** before running browser agents
- Never give browser automation agents DELETE permissions on databases
- Prevent autonomous agents from making destructive changes
- **Human-in-the-loop checkpoint** recommended before any write operations

---

## 19. PERMISSIONS & CONTEXT MANAGEMENT

### Permission Levels
| Level | What It Controls |
|---|---|
| **File Read** | Claude can read any file in the project |
| **File Write** | Claude can create/edit files |
| **Bash Execute** | Claude can run terminal commands |
| **Network** | Claude can make API calls |
| **Bypass Permissions** | Claude acts without asking approval (development only) |

### Context Management Best Practices
1. **Start each major task with `/clear`** — fresh context = no inherited confusion
2. **Use `/compact` proactively** — before context gets full, not after
3. **Define scope in CLAUDE.md** — what files are in-bounds for this project
4. **Subagents for heavy tasks** — keep main context clean
5. **Skills for repeated tasks** — avoid pasting the same instructions twice

### Anti-Pattern: Context Poisoning
If Claude makes a mistake and you correct it in conversation, the mistake + correction both stay in context. Over long sessions this creates "context poisoning" where Claude gets confused. Solution: `/clear` and re-state from CLAUDE.md.

---

## 20. GITHUB & WORKTREES

### Why GitHub Matters for Claude Code
- Version control = safety net for Claude's edits
- Can roll back any change Claude makes
- Enables collaboration across team members
- GitHub MCP lets Claude Code interact with repos, issues, and PRs directly

### Git Worktrees
**Worktrees** allow you to run multiple branches of a project simultaneously in separate folders — key for parallel Claude Code sessions.

```bash
git worktree add ../project-feature-branch feature-branch
```

- Run Claude Code on `main` AND `feature-branch` at the same time
- Different terminal windows = different Claude contexts
- Enables parallel development without branch conflicts

### The Parallel Session Workflow
1. Create a worktree for each feature or experiment
2. Open each worktree in a separate VS Code window
3. Run independent Claude Code sessions in each
4. Merge when complete
- **Why this matters:** You can run 3–5 parallel builds simultaneously, multiplying output

---

## 21. THE SELLING AI MINDSET

### Reframe: You Are Not Selling Code
Clients do not care about Claude Code. They care about:
- Time saved per week
- Revenue generated
- Errors eliminated
- Costs reduced
- Competitive advantage gained

### The ROI Framing Principle
> **Price against ROI, not "what feels right."**

Formula:
```
Annual Value to Client = (Time Saved × Hourly Rate × 52 weeks)
                       + (Revenue Gained)
                       + (Errors Avoided × Cost per Error)

Your Price = 20–40% of Annual Value
```

### The Free Sample Phase (2026 Meta-Strategy)
- AI tools are in a "free sample phase" — companies are competing for users
- Use this aggressively to build skills and ship projects
- But: build projects flexible enough to **swap tools** when pricing resets
- Lock-in to one AI platform is a business risk

### The 4 AI Agents Nate Sold for $23k (Real Case Studies)
| Project | Price | ROI for Client |
|---|---|---|
| Personalized Outreach Writer | ~$4,000 | $400/month saved (~12 month payback) |
| Sales Agent (lead research + outreach) | $4,000 | Direct revenue lift |
| Customer Support Agent (RAG-based) | ~$9,000 | FTE cost reduction |
| Personal Assistant Agent | $6,000 | ~10 hours/week saved |

### Lessons from the $23k
1. Visibility (posting builds online) creates inbound leads — no cold outreach needed for first clients
2. Price based on ROI, not time invested
3. Sales-focused automations justify the highest prices because ROI is easiest to quantify
4. Personal assistant agents are hardest to price because ROI is qualitative
5. Every project should include a **case study / data collection phase** to prove ROI for the next sale

---

## 22. FINDING CLIENTS

### The Inbound Flywheel
```
Post your builds online (YouTube, Twitter/X, LinkedIn)
    ↓
Viewers see the work
    ↓
Viewers become interested prospects
    ↓
Prospects reach out to you
    ↓
You qualify and close
    ↓
Case study → post online → repeat
```

### Primary Channels for Finding Clients
| Channel | Strategy | Speed |
|---|---|---|
| **YouTube** | Build in public, post live builds | Slow (3–6 months) but powerful |
| **LinkedIn** | Post results, not pitches | Medium (1–3 months) |
| **Twitter/X** | Share builds, engage in AI conversations | Medium |
| **Cold Outreach** | Personalized DMs with research | Fast (days) but lower close rate |
| **Community** | Skool, Discord, Slack groups | Fast access to buyers |
| **Warm Network** | Friends, former colleagues, family businesses | Fastest (days) |

### The Niche Strategy
- Pick ONE niche to start (dental offices, law firms, real estate agents, e-commerce brands)
- Learn the pain points deeply
- Build 2–3 templates for that niche
- Become the "AI automation person for [niche]"
- **Better to be the best in a small niche than average in a broad market**

### Cold Outreach Script Framework
1. Research the person + their company (use Claude Code to automate this)
2. Identify one specific pain point visible from their online presence
3. Reference that pain point in your opener (makes it personal)
4. Show a quick example or result (not a long pitch)
5. One clear CTA: "Would a 15-minute call make sense?"

---

## 23. FIRST CLIENT IN 7 DAYS

### The 7-Step Plan
1. **Day 1 — Pick a niche** — Choose one industry you know or can research quickly
2. **Day 2 — Build a demo** — Create one automation relevant to that niche (does not need to be perfect)
3. **Day 3 — Post the demo** — Share on LinkedIn, Twitter, or a relevant community
4. **Day 4 — Build a lead list** — Use Claude Code to find 20–50 businesses in your niche
5. **Day 5 — Send outreach** — Personalized messages referencing their specific situation
6. **Day 6 — Follow up** — 80% of closes happen on the follow-up, not the first message
7. **Day 7 — Close a discovery call** — Goal is a call, not a close. Discovery → proposal → close

### The AI OS Entry Offer (2026 Strategy)
- Instead of jumping straight to pitching a $10k project, offer **1-on-1 AI OS setup hours**
- Help the business owner set up their own Claude Code AI Operating System
- Lower barrier, faster close, immediate value delivery
- Natural upsell: "Now that your AI OS is set up, let's automate your [specific pain point] for $X/month"

### Discovery Call Framework
Ask these questions in order:
1. "What tasks does your team repeat most often every week?"
2. "How long does that take, and who does it?"
3. "What would it mean for your business if that was automated?"
4. "What have you tried before to solve this?"
5. "If we could cut that time by 80%, what would you do with those hours?"

---

## 24. PRICING AI WORKFLOWS

### The 3 Pricing Models
| Model | Description | When to Use |
|---|---|---|
| **Project-Based** | Fixed price for a defined deliverable | First project with new client; well-defined scope |
| **Retainer** | Monthly fee for ongoing work + support | After proving value; client needs updates + maintenance |
| **Value-Based** | Price = % of ROI delivered | Best for high-ROI automations; requires ROI quantification |

### Pricing Benchmarks (Nate's Data)
| Deliverable | Price Range |
|---|---|
| Simple single automation | $500–$2,000 |
| Multi-step workflow | $2,000–$5,000 |
| Full agent system (RAG + integrations) | $5,000–$15,000 |
| Monthly retainer (maintenance + optimization) | $1,000–$5,000/month |
| Enterprise multi-agent system | $15,000–$50,000+ |

### The Value-Based Pricing Formula
```
ROI = (Hours Saved/Month × Employee Hourly Rate × 12 months)
    + (Revenue Generated by Automation)
    + (Error Prevention Value)

Price = 20–40% of Annual ROI
```

**Example:**
- Automation saves 40 hours/month at $50/hr = $2,000/month = $24,000/year
- At 25% of annual ROI → charge **$6,000** for the project
- Client gets $18,000 in net savings in year 1 alone

### What Sells at the Highest Prices
1. **Sales automations** — direct revenue link, easiest ROI to quantify
2. **Customer support automations** — eliminates FTE headcount, huge ROI
3. **Operations automations** — saves hours, quantifiable at any hourly rate
4. **Personal assistant agents** — hardest to price (qualitative ROI), price on trust

### The Retainer Play
- Build the project at a slightly lower initial price
- Include a **maintenance + optimization retainer** from day one
- Add 2–3 new features per month to justify the retainer
- Collect ROI data every month → use it to expand the engagement
- Target: **$5,000–$20,000/month retainer per anchor client**

---

## 25. DELIVERING AI PROJECTS

### The Delivery Framework
1. **Discovery** — Deep intake of client's process, pain points, current tools
2. **Architecture Proposal** — Show the technical plan before building (prevents scope creep)
3. **MVP Build** — Build the smallest version that delivers the core value
4. **Client Review Loop** — Show, get feedback, iterate (not a "big reveal")
5. **Testing Phase** — Run live with real data, client supervises
6. **Handoff + Documentation** — CLAUDE.md + workflow docs + training call
7. **Retainer Proposal** — Close the ongoing relationship

### What to Include in Every Delivery
- Source code in a private GitHub repo (client owns it)
- CLAUDE.md explaining how the system works
- Workflow documentation (what each automation does)
- Video walkthrough (screen recording of the system working)
- Maintenance instructions (what to do if something breaks)

### Managing Client Expectations
- Always underpromise on timeline, overpromise on value
- Show progress early and often (not just the final product)
- Build in "checkpoints" where client approves before moving to next phase
- Never go dark for more than 48 hours

### Post-Delivery: The ROI Loop
1. After delivery, track the actual hours/revenue impact for 30–90 days
2. Document the results with specific numbers
3. Share results with client → builds trust → opens upsell conversation
4. Use the case study in your marketing (with permission)

---

## 26. MASTER FRAMEWORKS & MENTAL MODELS

### Framework 1: WAT Framework
> Workflows (markdown SOPs) → Agent (Claude Code + CLAUDE.md) → Tools (Python scripts)
> Separates probabilistic AI reasoning from deterministic code execution

### Framework 2: The Agentic Loop
> Plan → Execute → Self-Heal → Deliver
> Agent reads errors, refactors, and retries before asking humans for help

### Framework 3: Progressive Context Loading
> Skill metadata (always) → Full SKILL.md (when triggered) → Support files (when needed)
> Minimizes token consumption while maintaining full capability

### Framework 4: The Inbound Flywheel
> Build publicly → Visibility → Inbound leads → Close → Case study → Build publicly
> The flywheel compounds: each project funds the next video, each video generates the next project

### Framework 5: ROI-First Pricing
> Quantify annual value to client → Price at 20–40% of that value
> Never price based on hours worked; price based on value delivered

### Framework 6: The 4 Agentic Patterns (n8n)
| Pattern | Description |
|---|---|
| **Prompt Chaining** | Sequential task processing; output of step N is input of step N+1 |
| **Routing** | Intelligent decision-making; agent routes tasks to different paths based on conditions |
| **Parallelization** | Concurrent operations; run multiple sub-tasks simultaneously |
| **Evaluator-Optimizer** | Continuous improvement; a second agent evaluates and optimizes the output of the first |

### Framework 7: The 5-Step Automation Business Framework
| Step | Focus |
|---|---|
| 1. Foundations | Understand AI automation basics, n8n, no-code tools |
| 2. Process Mapping | Map client's current workflows; identify automation candidates |
| 3. Workflow vs. Agent Decision | Determine if task needs a step-by-step workflow or an agentic approach |
| 4. Build and Validate | Build MVP, test with real data, iterate |
| 5. Ship and Sell | Deploy, deliver, close retainer, collect case study |

---

## 27. RULES & MECHANISMS

### Technical Rules

**R1.** Always enter **Plan Mode** before executing any build. Never let Claude write code without a reviewed plan.

**R2.** Never store API keys in code files. Always use `.env` for local development and platform secrets (Modal Secrets, GitHub Secrets) for deployment.

**R3.** `CLAUDE.md` is the single source of truth for all project-level instructions. If you tell Claude something important once, put it in CLAUDE.md.

**R4.** Use **progressive context loading** — don't dump entire codebases into context. Let Skills and the WAT Framework handle selective loading.

**R5.** Include a **self-healing instruction** in every CLAUDE.md: "Read errors, refactor tools, update workflows, retry before asking for help."

**R6.** Run **`/compact`** before context fills up, not after — proactive compression preserves context quality.

**R7.** Use **sub-agents** for tasks requiring specialized permissions or isolated context; use **skills** for reusable instructions.

**R8.** **Agent Teams** are the most expensive orchestration mode — only use for genuinely parallel tasks where time savings justify token cost.

**R9.** Use **Git worktrees** to run parallel Claude Code sessions on different branches simultaneously.

**R10.** Always run a **security review** before deploying any automation to production. Check for exposed API keys, unsecured webhooks, and destructive permissions.

### Business Rules

**B1.** Price work based on **ROI delivered** to the client, not hours worked. Target 20–40% of the annual value the automation creates.

**B2.** The **inbound flywheel** is more powerful than cold outreach. Post your builds publicly before spending time on cold DMs.

**B3.** **Sell the boring automation** — clients pay for pain relief, not impressive tech demos.

**B4.** Every project should include a **retainer proposal** at delivery. The goal is monthly recurring revenue, not one-time project fees.

**B5.** Collect **ROI data** after every project. Specific numbers (hours saved, revenue generated) are your most powerful sales tool for the next client.

**B6.** Start with an **AI OS offer** (setup hours) before pitching large automation projects — lower barrier, faster close, natural upsell.

**B7.** Sales-focused automations command the highest prices because their ROI is most directly quantifiable.

**B8.** Build projects that are **tool-agnostic** where possible — the AI tool landscape is changing fast; don't lock clients or yourself into one platform.

---

## 28. KEY PRINCIPLES

### P1: AI as Orchestrator, Code as Executor
Never use AI for steps that should be deterministic. AI reasons and plans; Python (tools) executes. This is the deepest insight in the WAT Framework.

### P2: Visibility Creates Inbound
The best client acquisition strategy is to work publicly. Post builds on YouTube and LinkedIn before cold outreach. The effort-to-return ratio of inbound is 10x better than cold.

### P3: Annoying > Impressive
The most monetizable automations are the ones that solve annoying daily problems, not the ones that impress at demos. Prioritize client pain over personal excitement.

### P4: Skills Are Organizational Memory
Skills transform individual expertise into team capability. A skill built once can be used by any team member forever. This is the secret to scaling a solo automation practice.

### P5: CLAUDE.md Is Your Moat
The quality of your CLAUDE.md files is a competitive advantage. A client who gets handed a project with a detailed, battle-tested CLAUDE.md gets more long-term value than one getting raw code.

### P6: Context is a Scarce Resource
Every token in context has a cost. Treat context window management like memory management in programming. Load only what you need, when you need it.

### P7: The Retainer is the Business
A one-time project is a transaction. A monthly retainer is a business. Every project you deliver is an audition for a retainer. Design your delivery to make retainers the obvious next step.

### P8: Ship First, Perfect Later
The #1 mistake is over-engineering before shipping. Build the MVP that solves 80% of the problem in 20% of the time. Ship it. Iterate based on real feedback.

---

## 29. INTERCONNECTIONS

### How Concepts Connect

```
CLAUDE.md (brain)
    ├── loads → Skills (reusable capabilities)
    ├── defines → WAT Framework (build structure)
    ├── orchestrates → Sub-agents (specialists)
    └── enables → Agent Teams (parallel collaboration)

WAT Framework
    ├── Workflows → define objectives + SOPs
    ├── Agent → Claude Code executes plan
    └── Tools → Python scripts do the deterministic work

Skills
    ├── use Progressive Loading → save tokens
    ├── encode → Team Knowledge
    └── improve via → Learnings.md loop

Business Layer
    ├── Inbound Flywheel → posts builds online → generates leads
    ├── Discovery Call → reveals ROI → informs pricing
    ├── Value-Based Pricing → based on ROI Formula
    ├── Delivery Framework → leads to → Retainer
    └── ROI Data → feeds back into → next sale pitch
```

### Cross-References
- **Skills + Context Windows:** Skills' progressive loading is the primary mechanism for keeping context clean in large projects → see §4 and §15
- **CLAUDE.md + WAT Framework:** CLAUDE.md is Layer 2 of WAT — the agent brain that knows how to navigate Layers 1 and 3 → see §5 and §6
- **Sub-agents + Agent Teams:** Sub-agents follow parent-child hierarchy; Agent Teams add peer-to-peer — they are the same file format with different runtime roles → see §16 and §17
- **RAG + n8n + App:** RAG provides the intelligence layer; n8n provides the automation layer; Claude Code wraps both in a UI = a sellable product → see §10, §11
- **Pricing + ROI Data + Case Studies:** These three create a compound effect — more data = higher prices = bigger case studies = higher prices → see §21, §24, §25

---

## 30. SKILL EXTRACTION — BUILDABLE SKILLS FROM THIS COURSE

The following are **concrete skills** that can be built as SKILL.md files based on Nate's course content. Each is described so you can immediately build it.

---

### SKILL 1: `wat-builder`
**Purpose:** Builds a new automation project in the WAT Framework structure from a plain English description.  
**Trigger:** "Build an automation for [goal]" / "Create a new workflow" / "Set up a new project"  
**What it does:**
1. Enters Plan Mode, asks 5 clarifying questions
2. Creates `/workflows`, `/tools`, `/prompts` folder structure
3. Writes a `CLAUDE.md` for the project
4. Writes a workflow markdown SOP file
5. Writes a Python tool skeleton
6. Creates `.gitignore` and `.env.example`
**Why build it:** Every new project starts this way — write once, reuse forever.

---

### SKILL 2: `rag-pipeline-builder`
**Purpose:** Builds a RAG pipeline (document ingestion + query workflow) for a given document set and vector database.  
**Trigger:** "Build a RAG system" / "Make Claude answer questions from my documents" / "Create a knowledge base"  
**What it does:**
1. Asks: What documents? What vector DB (Pinecone/Supabase)?
2. Creates ingestion workflow (load → chunk → embed → store)
3. Creates query workflow (user query → embed → search → retrieve → respond)
4. Generates n8n workflow JSON or Python scripts
**Why build it:** RAG is in nearly every client project; automating its setup saves hours per project.

---

### SKILL 3: `n8n-to-app`
**Purpose:** Converts an n8n workflow into a full web app with a frontend UI and webhook integration.  
**Trigger:** "Wrap this n8n workflow in an app" / "Build a UI for my automation" / "Turn this into a product"  
**What it does:**
1. Asks for the n8n webhook URL and expected inputs/outputs
2. Generates an HTML/React frontend
3. Connects frontend to n8n webhook via fetch/axios
4. Deploys to Vercel via GitHub
**Why build it:** This 3–5x the perceived value of any automation — and the price you can charge.

---

### SKILL 4: `roi-calculator`
**Purpose:** Calculates the ROI of a proposed automation and generates a pricing recommendation.  
**Trigger:** "How much should I charge for this?" / "What's the ROI of this automation?" / "Help me price this project"  
**What it does:**
1. Asks: Hours saved per week? Who does it? Their hourly rate?
2. Asks: Any revenue impact? Any error prevention?
3. Calculates annual ROI
4. Outputs: Annual value, 25% price recommendation, 1-year client net savings
**Why build it:** Removes pricing uncertainty — gives you a defensible number backed by client math.

---

### SKILL 5: `claude-md-generator`
**Purpose:** Generates a complete CLAUDE.md for any new project based on a description.  
**Trigger:** "Generate CLAUDE.md" / "Set up the brain for this project" / "Create system prompt"  
**What it does:**
1. Asks 6 questions about the project (role, tools, rules, folder structure, MCPs, context)
2. Generates a complete CLAUDE.md with all sections
3. Includes self-healing instruction
4. Includes WAT Framework reference
**Why build it:** CLAUDE.md quality determines the quality of every output. Standardize it.

---

### SKILL 6: `client-discovery`
**Purpose:** Runs a structured AI-assisted discovery call framework and generates a proposal outline.  
**Trigger:** "Prepare for a discovery call" / "Help me qualify a client" / "Generate a proposal from this"  
**What it does:**
1. Provides the 5 discovery questions to ask (in the right order)
2. After answers are entered, identifies: main pain point, best automation candidates, rough ROI
3. Generates a 1-page proposal outline with pricing range
**Why build it:** Discovery calls win or lose projects — a consistent framework = consistent close rates.

---

### SKILL 7: `skill-creator`
**Purpose:** Builds a new SKILL.md from a description of what the skill should do.  
**Trigger:** "Create a new skill" / "Build a skill that does X" / "Turn this into a reusable skill"  
**What it does:**
1. Asks: What is the skill name? What does it do? When should it trigger?
2. Generates YAML frontmatter with name, description, allowed-tools
3. Generates step-by-step instructions
4. Generates edge case section
5. Saves to `.claude/skills/[name]/SKILL.md`
**Why build it:** Meta-skill — enables the entire skills system to grow itself.

---

### SKILL 8: `deployment-checklist`
**Purpose:** Runs through the pre-deployment security and quality checklist before pushing any automation to production.  
**Trigger:** "Ready to deploy" / "Check before I deploy" / "Pre-launch review"  
**What it does:**
1. Checks for exposed API keys in all files
2. Checks for unsecured webhooks
3. Checks for destructive permissions
4. Checks error handling coverage
5. Generates a ✅/❌ checklist report
**Why build it:** Security failures can kill client trust instantly. Automate the check.

---

### SKILL 9: `outreach-writer`
**Purpose:** Generates personalized cold outreach messages based on a researched prospect profile.  
**Trigger:** "Write outreach for this prospect" / "Generate cold email" / "Personalize my pitch"  
**What it does:**
1. Takes: Prospect name, company, role, visible pain point, your offer
2. Generates: Opening line (pain-specific), value proposition, CTA
3. Also generates: Follow-up message for 3 days later
**Why build it:** Personalized outreach = 3–5x higher reply rates. Sell this as a standalone demo.

---

### SKILL 10: `case-study-generator`
**Purpose:** Transforms project ROI data into a formatted case study for marketing use.  
**Trigger:** "Write a case study" / "Document this project" / "Turn these results into marketing"  
**What it does:**
1. Asks: Client type, problem, solution built, metrics before/after, time to build
2. Generates: Problem section, solution section, results section (with numbers), quote placeholder
3. Formats for: LinkedIn post, full written case study, one-page PDF summary
**Why build it:** Case studies are the highest-ROI marketing asset. Automate their creation.

---

## 31. CLAUDE BEHAVIORAL INSTRUCTIONS

When operating under this knowledge base, Claude should follow these instructions:

**Instruction 1 — Always Plan Before Building**
> When a user asks Claude to build any automation, workflow, script, or app using Claude Code: ALWAYS recommend entering Plan Mode first. Ask at minimum: (1) What is the goal? (2) What inputs does it take? (3) What should the output be? (4) What happens if it fails? Do not skip to execution.

**Instruction 2 — Apply Value-Based Pricing Before Suggesting a Price**
> When asked to estimate the price of an automation project, ALWAYS apply the ROI Formula first:  
> `Annual ROI = (Hours Saved/Month × Hourly Rate × 12) + Revenue Impact + Error Prevention`  
> `Price = 20–40% of Annual ROI`  
> Never suggest an hourly rate or "time-based" price as the primary model. Present the ROI calculation first, then derive the price from it.

**Instruction 3 — Apply the WAT Framework to All Automation Architectures**
> When designing any automation system, ALWAYS structure the response using the WAT Framework:  
> (1) What **Workflow** (SOP) will govern this? (2) What should the **Agent** (CLAUDE.md) know? (3) What **Tools** (Python scripts) will execute the deterministic steps?  
> If the user hasn't considered one of these layers, flag it explicitly.

---

## 📊 QUICK REFERENCE CARD

```
┌────────────────────────────────────────────────────────────────┐
│                 NATE HERK — QUICK REFERENCE                    │
├───────────────────┬────────────────────────────────────────────┤
│ BUILD FRAMEWORK   │ WAT: Workflows → Agent → Tools             │
│ SYSTEM PROMPT     │ CLAUDE.md (root + global + sub-folder)     │
│ REUSABLE CAPS     │ Skills (.claude/skills/name/SKILL.md)      │
│ SPECIALISTS       │ Sub-agents (.claude/agents/name.md)        │
│ PARALLEL BUILD    │ Agent Teams (mailbox + peer-to-peer)       │
│ DATA INTELLIGENCE │ RAG (embed → vector DB → retrieve → answer)│
│ BROWSER CONTROL   │ Playwright MCP                             │
│ DEPLOYMENT        │ Modal (serverless) / VPS (24/7)            │
│ VERSION CONTROL   │ GitHub + Worktrees (parallel sessions)     │
├───────────────────┼────────────────────────────────────────────┤
│ PRICING MODEL     │ Value-Based: 20–40% of Annual ROI          │
│ CLIENT ACQUIS.    │ Inbound Flywheel → post builds publicly    │
│ FIRST OFFER       │ AI OS Setup Hours (low barrier)            │
│ END GOAL          │ Monthly Retainer ($1k–$20k/mo)             │
│ DELIVERY          │ MVP → Review Loop → Handoff → Retainer     │
├───────────────────┼────────────────────────────────────────────┤
│ KEY COMMANDS      │ /compact /clear /btw /resume               │
│ CONTEXT RULE      │ Load only what's needed, when it's needed  │
│ SECURITY RULE     │ NEVER store keys in code files             │
│ PLAN RULE         │ ALWAYS use Plan Mode before executing      │
│ SELF-HEAL RULE    │ Read error → refactor → retry → then ask  │
└───────────────────┴────────────────────────────────────────────┘
```

---

*Generated from: Nate Herk "Build & Sell with Claude Code (10+ Hour Course)"*  
*Timestamp sections covered: 00:00 → 9:58:55*  
*Knowledge compiled: May 2026*
