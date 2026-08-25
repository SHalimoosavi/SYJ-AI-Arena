# SYJ AI Arena

> Multi-agent AI debate engine for strategic decision analysis.

SYJ AI Arena is a TypeScript/Node.js application that simulates a high-stakes strategic debate between seven specialized AI personas and an independent Judge.

Instead of asking one AI:

> "What should we do?"

SYJ AI Arena creates a structured adversarial environment where multiple perspectives are forced to compete.

The system currently includes:

1. ARCHITECT
2. SECURITY ENGINEER
3. CHAOS ENGINEER
4. BUSINESSMAN
5. PHILOSOPHER
6. HACKER
7. SKEPTIC
8. INDEPENDENT JUDGE

The arena executes three stages:

```text
                    ┌─────────────────────┐
                    │     CORE DILEMMA    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      ROUND 1        │
                    │ Opening Statements  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      ROUND 2        │
                    │ Dynamic Cross-Fire  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      ROUND 3        │
                    │ Independent Judge   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      VERDICT        │
                    │ Score + Reasoning   │
                    └─────────────────────┘
