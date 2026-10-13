# Backups

Database dumps and upload archives are deliberately excluded from Git. Store
them encrypted in the configured backup location, with retention, checksums and
a tested restore procedure. The deployment workflow writes verified backups
outside the product checkout through `infra/scripts/prod.sh`.

Local files already present in this directory are not removed by the ignore
policy.
