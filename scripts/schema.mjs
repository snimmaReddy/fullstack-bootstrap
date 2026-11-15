#!/usr/bin/env node
// Manage JSON schemas in schemas/. While the API runs in Development it picks up changes on save.
//
//   node scripts/schema.mjs new <name> field:type[!] ...     create schemas/<name>.json
//        types: string text email number integer boolean date enum   (! = required)
//        enum:  category:enum=hardware,software,service
//        e.g.   node scripts/schema.mjs new product name:string! price:number inStock:boolean
//   node scripts/schema.mjs list                             list schemas
//   node scripts/schema.mjs delete <name> [--drop-data] [--yes]
//        removes the file; data is kept unless --drop-data (asks for confirmation unless --yes)
//
// To update a schema, edit its JSON file.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'schemas');
const META = 'schema.schema.json';
const TYPES = ['string', 'text', 'email', 'number', 'integer', 'boolean', 'date', 'enum'];
const ALIASES = { bool: 'boolean', int: 'integer' };

const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const args = rest.filter((a) => !a.startsWith('--'));

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};
const fileOf = (name) => join(dir, `${name}.json`);
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

function readSchema(file) {
  return JSON.parse(readFileSync(join(dir, file), 'utf8'));
}

function cmdNew() {
  const [name, ...specs] = args;
  if (!/^[a-z][a-z0-9]*$/.test(name ?? ''))
    die('Usage: schema.mjs new <name> field:type[!] ...   (name: lower-case letters/digits, e.g. product)');
  if (specs.length === 0) die('Give at least one field, e.g.  name:string!');
  if (existsSync(fileOf(name))) die(`schemas/${name}.json already exists. Edit it instead.`);

  const fields = {};
  for (const spec of specs) {
    const m = spec.match(/^([a-z][a-zA-Z0-9]*):([a-z]+)(!)?(?:=(.+))?$/);
    if (!m) die(`Bad field "${spec}". Format: name:type[!]  or  name:enum[!]=a,b,c`);
    const [, field, rawType, required, values] = m;
    const type = ALIASES[rawType] ?? rawType;
    if (!TYPES.includes(type)) die(`Unknown type "${rawType}" for "${field}". Types: ${TYPES.join(', ')}`);
    if (['id', 'createdAt', 'updatedAt'].includes(field)) die(`"${field}" is added automatically.`);
    if (fields[field]) die(`Field "${field}" is listed twice.`);
    const def = { type };
    if (required) def.required = true;
    if (type === 'enum') {
      if (!values) die(`Enum field "${field}" needs values, e.g.  ${field}:enum=a,b,c`);
      def.values = values.split(',').map((v) => v.trim()).filter(Boolean);
    } else if (values) die(`Only enum fields take "=values" ("${spec}").`);
    fields[field] = def;
  }

  const schema = { $schema: `./${META}`, name, title: capitalize(name) + 's', fields };
  writeFileSync(fileOf(name), JSON.stringify(schema, null, 2) + '\n');
  console.log(`created  schemas/${name}.json`);
  console.log('Edit it to add labels, limits (maxLength, min, max), unique, defaults. The API reloads it on save.');
}

function cmdList() {
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== META).sort();
  if (files.length === 0) return console.log('No schemas yet. Create one: node scripts/schema.mjs new <name> field:type ...');
  const rows = [['NAME', 'COLLECTION', 'FIELDS', 'FILE']];
  for (const f of files) {
    try {
      const s = readSchema(f);
      rows.push([s.name ?? '?', s.collection ?? `${s.name}s`, String(Object.keys(s.fields ?? {}).length), `schemas/${f}`]);
    } catch {
      rows.push([f.replace(/\.json$/, ''), '-', '-', `schemas/${f}  (invalid JSON)`]);
    }
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd());
}

function apiConnectionString() {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  const p = join(root, 'api', 'appsettings.Development.json');
  const conn = existsSync(p) && JSON.parse(readFileSync(p, 'utf8')).Mongo?.ConnectionString;
  if (!conn) die('No MongoDB connection string. Run scripts/db.sh init-users, or set MONGO_URL.');
  return conn;
}

async function cmdDelete() {
  const [name] = args;
  if (!name) die('Usage: schema.mjs delete <name> [--drop-data] [--yes]');
  if (!existsSync(fileOf(name))) die(`schemas/${name}.json not found.`);

  let collection = `${name}s`;
  try {
    collection = readSchema(`${name}.json`).collection ?? collection;
  } catch {
    /* invalid JSON: fall back to the default collection name */
  }

  const drop = flags.has('--drop-data');
  if (drop && !flags.has('--yes')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
      `This permanently deletes every document in "${collection}". Type the collection name to confirm: `);
    rl.close();
    if (answer.trim() !== collection) die('Cancelled. Nothing was deleted.');
  }

  // Remove the file first so a running API stops serving it before the data goes.
  unlinkSync(fileOf(name));
  console.log(`deleted  schemas/${name}.json`);

  if (!drop) {
    console.log(`Data in "${collection}" was kept. Drop it later with --drop-data, or from Compass as admin.`);
    return;
  }
  const r = spawnSync('mongosh', [apiConnectionString(), '--quiet', '--eval',
    `print(db.getCollection(${JSON.stringify(collection)}).drop())`], { encoding: 'utf8' });
  if (r.status !== 0) die(`Could not drop "${collection}": ${(r.stderr || r.stdout).trim()}`);
  console.log(r.stdout.trim() === 'true' ? `dropped  collection ${collection}` : `collection ${collection} did not exist`);
}

switch (cmd) {
  case 'new': cmdNew(); break;
  case 'list': cmdList(); break;
  case 'delete': await cmdDelete(); break;
  default:
    die('Usage: node scripts/schema.mjs new <name> field:type[!] ... | list | delete <name> [--drop-data] [--yes]');
}
