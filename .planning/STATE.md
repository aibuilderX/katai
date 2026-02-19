# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.
**Current focus:** v1.1 Phase 9 — Core Agent Pipeline + Generation Execution

## Current Position

Phase: 9 of 12 (Core Agent Pipeline + Generation Execution)
Plan: 0 of 5 in current phase (planning complete, ready for execution)
Status: Phase 9 Planned — 5 plans ready for execution
Last activity: 2026-02-18 — Phase 9 planning complete (5 plans, 11 tasks, 16 requirements covered)

Progress: [█████████░░░░░░░░░░░] 47% (v1.0 complete, v1.1 Phase 8 code complete, Phase 9 planned)

## Performance Metrics

**v1.0 Velocity (archived):**
- Total plans completed: 26
- Average duration: ~20 min
- Total execution time: ~544 min

**v1.1 Velocity:**
- Total plans completed: 3
- Average duration: ~5 min
- Total execution time: ~14 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 08    | 01   | ~6 min   | 1     | 1     |
| 08    | 02   | 6 min    | 2     | 6     |
| 08    | 03   | 2 min    | 1     | 1     |

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
Key v1.1 decisions pending execution:
- Dual-audience model (Auto/Guided/Pro): same 7-agent engine, different interface layers
- NotebookLM MCP: feature-flagged, graceful degradation required, Gemini fallback planned
- Seedance 2.0: feature-flagged behind SEEDANCE_PROVIDER, pipeline must work without it
- Compliance auto-rewrite: "flag + human confirm" — never auto-certify (legal liability)

Key v1.1 decisions executed (Phase 8):
- All agents default to claude-opus-4-6, configurable via AGENT_*_MODEL env vars
- Pipeline mode defaults to "pro" until Auto mode (Phase 10)
- Cost alert threshold: 5000 yen default via CAMPAIGN_COST_ALERT_THRESHOLD_YEN
- 4 milestones with Japanese labels: strategy/content/assets/packaging
- brandMemory null until Phase 11 populates
- n8n upgrade was no-op: VPS already running 2.x with AI Agent nodes available
- runDirectGeneration kept functional as safety net; deprecation warning added with v1.2 removal timeline

### Pending Todos

- Complete 04-USER-SETUP.md: configure Runway, ElevenLabs, fal.ai, HeyGen API keys
- Add ANTHROPIC_API_KEY to Vercel env vars when available
- Update Supabase Auth Site URL and Redirect URLs to production domain
- Add custom domain to Vercel when ready
- Verify Seedance 2.0 fal.ai endpoint naming before Phase 12 (anticipated from 1.5 pattern, unverified)
- Validate NotebookLM MCP session persistence on headless VPS before Phase 11

### Roadmap Evolution

- Phase 9.1 inserted after Phase 9: Agent Prompt Engineering + Photorealistic Output — research-backed prompt optimization for all 5 pipeline agents, ultra-realistic character generation methodology, prompt quality as competitive moat

### Blockers/Concerns

- [Phase 9]: n8n Execute Sub-workflow data return behavior with Wait nodes needs validation before building critique loop
- [Phase 10]: Schwartz/LF8 classification accuracy from Japanese plain-language input is MEDIUM confidence — confirmation step before generation is a required mitigation
- [Phase 11]: NotebookLM MCP browser automation on headless VPS is unverified — design Gemini API grounding fallback path in parallel
- [Phase 12]: Compliance rewrite quality (preserving persuasive intent) needs native JP legal reviewer before shipping

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 9.1 context gathered
Resume file: .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-CONTEXT.md
