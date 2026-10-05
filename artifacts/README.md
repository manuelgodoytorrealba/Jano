# Generated artifacts

This directory is reserved for generated editorial reports, evaluation inputs
and CI outputs. Data files are intentionally excluded from Git because they are
large, mutable and may contain private editorial context.

- CI outputs belong in the corresponding workflow run or release.
- Reproducible reports should be regenerated with the script that owns them.
- Non-reproducible inputs must be stored in the team's controlled artifact
  storage and restored here before running dependent editorial tools.
- Never commit credentials, tokens, raw model payloads or personal data.
