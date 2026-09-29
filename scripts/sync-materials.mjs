/*
 * Copies the FDM-INSPECT material database into this repo.
 *
 * The Cloudflare Pages build cannot reach the sibling FDM-INSPECT repository, so the
 * JSON is vendored as src/data/fdm-inspect-materials.json and committed.
 * Run after the material DB changes:
 *
 *   npm run materials:sync -- ../FDM-INSPECT/materials/materials.json
 *
 * The source path is a required argument (no implicit default). The file is
 * copied byte-for-byte after a schema check, so provenance (source URLs,
 * SHA-256 of the datasheets, source_text) is preserved.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPORTED_SCHEMA_VERSION = '1.0';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetPath = path.join(rootDir, 'src', 'data', 'fdm-inspect-materials.json');

function fail(message) {
  console.error(`materials:sync: ${message}`);
  process.exit(1);
}

const sourceArgument = process.argv[2];
if (!sourceArgument) {
  fail('missing argument: path to FDM-INSPECT materials/materials.json');
}
const sourcePath = path.resolve(process.cwd(), sourceArgument);

let raw;
try {
  raw = await readFile(sourcePath);
} catch (error) {
  fail(`cannot read ${sourcePath}: ${error.message}`);
}

let database;
try {
  database = JSON.parse(raw.toString('utf8'));
} catch (error) {
  fail(`invalid JSON in ${sourcePath}: ${error.message}`);
}

if (database.schema_version !== SUPPORTED_SCHEMA_VERSION) {
  fail(`unsupported schema_version "${database.schema_version}" (expected "${SUPPORTED_SCHEMA_VERSION}")`);
}
if (!Array.isArray(database.materials) || database.materials.length === 0) {
  fail('"materials" must be a non-empty array');
}
for (const material of database.materials) {
  if (typeof material.id !== 'string' || typeof material.polymer !== 'string' || typeof material.properties !== 'object') {
    fail(`material entry without id/polymer/properties: ${JSON.stringify(material).slice(0, 120)}`);
  }
}

await writeFile(targetPath, raw);
const sha256 = createHash('sha256').update(raw).digest('hex');
console.log(
  `materials:sync: copied ${database.materials.length} materials (generated ${database.generated}) ` +
    `to ${path.relative(rootDir, targetPath)} sha256=${sha256}`,
);
