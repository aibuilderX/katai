# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** A non-technical user submits a brief and receives a complete, download-ready campaign kit with correct Japanese copy and platform-compliant assets in under 5 minutes.
**Current focus:** v1.1 Phase 9.1 — Agent Prompt Engineering + Photorealistic Output

## Current Position

Phase: 9.1 of 12 (Agent Prompt Engineering + Photorealistic Output)
Plan: 1 of 5 in current phase (Plan 01 complete — shared data modules and pipeline types)
Status: Phase 9.1 Executing — Plan 01 complete, Plans 02-05 pending
Last activity: 2026-02-19 — Plan 01 complete (shared frameworks, register map, platform norms, flux techniques, quality checklist, agent config, pipeline type updates)

Progress: [█████████░░░░░░░░░░░] 49% (v1.0 complete, v1.1 Phase 8 code complete, Phase 9.1 Plan 01 complete)

## Performance Metrics

**v1.0 Velocity (archived):**
- Total plans completed: 26
- Average duration: ~20 min
- Total execution time: ~544 min

**v1.1 Velocity:**
- Total plans completed: 4
- Average duration: ~5 min
- Total execution time: ~21 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 08    | 01   | ~6 min   | 1     | 1     |
| 08    | 02   | 6 min    | 2     | 6     |
| 08    | 03   | 2 min    | 1     | 1     |
| 09.1  | 01   | 7 min    | 2     | 8     |

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

Key v1.1 decisions executed (Phase 9.1):
- SB7 dropped from copywriting frameworks — narrative-focused, poorly suited for short-form Japanese ad copy
- AIDMA/AISAS added as Japanese-market frameworks (Dentsu standard) alongside PAS/AIDA/BAB
- negativePrompt removed from ArtDirectorOutput — Flux 1.1 Pro Ultra does not support it
- Temperature gradient 0.2-0.7 from analytical to creative agents
- All new pipeline type fields are optional for backward compatibility

### Pending Todos

- Complete 04-USER-SETUP.md: configure Runway, ElevenLabs, fal.ai, HeyGen API keys
- Add ANTHROPIC_API_KEY to Vercel env vars when available
- Update Supabase Auth Site URL and Redirect URLs to production domain
- Add custom domain to Vercel when ready
- Verify Seedance 2.0 fal.ai endpoint naming before Phase 12 (anticipated from 1.5 pattern, unverified)
- Validate NotebookLM MCP session persistence on headless VPS before Phase 11

### Roadmap Evolution

- Phase 9.1 inserted after Phase 9: Agent Prompt Engineering + Photorealistic Output — research-backed prompt optimization for all 5 pipeline agents, ultra-realistic character generation methodology, prompt quality as competitive moat
- ComfyUI Cloud evaluated and deferred to v1.2+ (DENH-04): architecture supports clean swap (~2-3 day effort), but current fal.ai pipeline is sufficient for v1.1. Key future wins: character consistency via IP-Adapter, face restoration, custom LoRAs, outpainting for platform resize

### Blockers/Concerns

- [Phase 9]: n8n Execute Sub-workflow data return behavior with Wait nodes needs validation before building critique loop
- [Phase 10]: Schwartz/LF8 classification accuracy from Japanese plain-language input is MEDIUM confidence — confirmation step before generation is a required mitigation
- [Phase 11]: NotebookLM MCP browser automation on headless VPS is unverified — design Gemini API grounding fallback path in parallel
- [Phase 12]: Compliance rewrite quality (preserving persuasive intent) needs native JP legal reviewer before shipping

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 09.1-01-PLAN.md (shared data modules and pipeline types)
Resume file: .planning/phases/09.1-agent-prompt-engineering-photorealistic-output/09.1-01-SUMMARY.md
