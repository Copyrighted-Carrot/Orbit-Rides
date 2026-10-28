# Repository working rules

Read `AGENT_STATE.md` before work. It is the current project-control document; detailed evidence lives in `docs/SYSTEM_AUDIT.md` and `docs/audit/`. Historical audit material is reference only.

- Only the owner identity `Copyrighted-Carrot <belindosamson@gmail.com>` may author or commit project changes. Never add an assistant, bot, co-author trailer, contributor entry, collaborator, or automation identity. If Git/GitHub identity or attribution is unclear, stop that operation and ask the owner.
- Use short-lived topic branches. Keep `main` deployable; never force-push or rewrite history without explicit authorization.
- Audit → document → plan → discuss → implement → test → document → commit. The current task authorizes audit and repository hygiene, not an application rewrite or production database changes.
- Verify complete UI → API/action → database → resulting UI flows. A clean build or convincing screen is not proof a business workflow works.
- Preserve useful functionality. Document questionable features and discuss their disposition before deleting them. Mark ambiguous business rules NEEDS DECISION.
- Never expose or commit secrets. Do not execute the destructive reset migration against valuable data. Use isolated fixtures for destructive, multi-user, payment and concurrency tests.
- Keep `AGENT_STATE.md` synchronized after milestones, corrections, branch changes, and before context handoff. Include what changed, verification, outstanding work and blockers.
- Preserve third-party legal notices and asset attribution. These are not project contributor entries.
