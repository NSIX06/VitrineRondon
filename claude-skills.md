# Claude Skills

Skills deste projeto. A fonte de verdade de cada uma é o próprio `SKILL.md` —
este arquivo é só um índice.

| Skill | Doc | O que faz |
|---|---|---|
| `security-skill-check` | [`.claude/skills/security-skill-check/SKILL.md`](.claude/skills/security-skill-check/SKILL.md) | Auditoria de segurança mecânica: 35 checks reais (secrets, inputs, auth, deps, headers, config) → nota 0-100, breakdown por categoria e lista de problemas com `arquivo:linha`. Verify: `node .claude/skills/security-skill-check/scripts/check.js --checks` |
