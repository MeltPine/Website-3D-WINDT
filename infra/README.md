# Cloudflare infrastructure files

## `r2-lifecycle.json`

Lifecycle rules of the R2 bucket `3dw-uploads` (binding `UPLOADS`). They
replace the former scheduled `upload-cleanup` Netlify Function and enforce the
retention stated on the privacy page (`src/lib/upload/policy.ts`):

| Rule | Prefix | Action |
|---|---|---|
| `uploads-files-retention` | `uploads/files/` | delete objects 90 days after upload (`retentionDays`); abort multipart uploads that were never completed after 2 days (`incompleteRetentionDays`) |
| `uploads-part-receipts` | `uploads/parts/` | delete per-chunk receipts after 2 days |
| `Default Multipart Abort Rule` | whole bucket | Cloudflare's default (7 days), kept because `set` replaces all rules |

`leads/` has no rule on purpose: lead records are business records and are
deleted manually according to the privacy page ("in der Regel bis zu 24 Monate
nach Abschluss").

`tests/upload.test.ts` fails if the ages or prefixes drift from
`UPLOAD_POLICY` / `server/uploadCore.ts`. After changing the policy, update this
file and apply it again.

Apply (needs `wrangler login` with an account that owns the bucket; `--force`
skips the "overwrite all rules" prompt):

```sh
npx wrangler r2 bucket lifecycle set 3dw-uploads --file infra/r2-lifecycle.json --jurisdiction eu
npx wrangler r2 bucket lifecycle list 3dw-uploads --jurisdiction eu
```

Omit `--jurisdiction eu` if the bucket was created without the EU jurisdiction.
Cloudflare removes expired objects asynchronously, typically within 24 hours
after they reach the configured age.
