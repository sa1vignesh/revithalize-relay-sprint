# Push Module 4 to GitHub

```bash
git clone https://github.com/revithalize/revithalize-relay-sprint.git
cd revithalize-relay-sprint
git checkout -b feat/vignesh-ingestion

# copy the contents of this folder into /backend (merge, do not overwrite teammates files)
cp -r /path/to/backend/. backend/
# If Althaf already committed prisma/schema.prisma, keep HIS version and delete mine.

cd backend && npm install && npx prisma generate && npx jest   # tests must pass
cd ..
git add backend/
git commit -m "feat(ingestion): OEM adapters, seed script, ingest + search APIs, ADAPTERS.md"
git push -u origin feat/vignesh-ingestion
```

Then open a Pull Request into `main` and ask one teammate to approve (no direct pushes to main).

Never commit `.env`, DB passwords or signing keys.
