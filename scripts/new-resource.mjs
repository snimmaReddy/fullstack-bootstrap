#!/usr/bin/env node
// Scaffolds a full resource: Mongo model + API controller + UI page.
//
//   node scripts/new-resource.mjs Product name:string! price:number inStock:bool description:text
//   node scripts/new-resource.mjs Faq question:string! answer:text! --public
//
// Resources require a signed-in user by default; --public makes the API endpoints anonymous.
//
// Field types: string | text | email | number | bool | date      (append ! for required)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const isPublic = args.includes('--public');
const [name, ...specs] = args.filter((a) => a !== '--public');

if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name) || specs.length === 0) {
  console.error('Usage: node scripts/new-resource.mjs <PascalName> field:type[!] ... [--public]');
  console.error('Types: string text email number bool date   (! = required)');
  process.exit(1);
}

const TYPES = {
  string: { cs: 'string', ts: 'string', ui: 'text' },
  text:   { cs: 'string', ts: 'string', ui: 'textarea' },
  email:  { cs: 'string', ts: 'string', ui: 'email', attr: 'EmailAddress' },
  number: { cs: 'decimal', ts: 'number', ui: 'number' },
  bool:   { cs: 'bool', ts: 'boolean', ui: 'checkbox' },
  date:   { cs: 'DateTime', ts: 'string', ui: 'date' },
};

const fields = specs.map((s) => {
  const [fname, rawType = 'string'] = s.split(':');
  const required = rawType.endsWith('!');
  const type = rawType.replace('!', '');
  if (!TYPES[type]) throw new Error(`Unknown type "${type}" for field "${fname}"`);
  const camel = fname[0].toLowerCase() + fname.slice(1);
  return {
    camel,
    pascal: fname[0].toUpperCase() + fname.slice(1),
    label: camel.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
    required,
    ...TYPES[type],
  };
});

const plural = name.endsWith('y') ? name.slice(0, -1) + 'ies' : name.endsWith('s') ? name + 'es' : name + 's';
const key = plural.toLowerCase();

const files = {
  [`api/Models/${name}.cs`]: `using System.ComponentModel.DataAnnotations;
using Api.Data;

namespace Api.Models;

[Collection("${key}")]
public class ${name} : BaseEntity
{
${fields.map((f) => {
  const attrs = [f.required && 'Required', f.attr].filter(Boolean);
  const isStr = f.cs === 'string';
  const type = f.required ? f.cs : `${f.cs}?`;
  const init = f.required && isStr ? ' = "";' : '';
  return `${attrs.length ? `    [${attrs.join(', ')}]\n` : ''}    public ${type} ${f.pascal} { get; set; }${init}`;
}).join('\n\n')}
}
`,
  [`api/Controllers/${plural}Controller.cs`]: `using Api.Models;
using Api.Repositories;
${isPublic ? 'using Microsoft.AspNetCore.Authorization;\n' : ''}
namespace Api.Controllers;

${isPublic ? '[AllowAnonymous]\n' : ''}public class ${plural}Controller(IRepository<${name}> repo) : CrudController<${name}>(repo);
`,
  [`web/src/resources/${key}.ts`]: `import type { Entity, ResourceConfig } from '../types';

export interface ${name} extends Entity {
${fields.map((f) => `  ${f.camel}${f.required ? '' : '?'}: ${f.ts};`).join('\n')}
}

const ${key}: ResourceConfig<${name}> = {
  key: '${key}',
  title: '${plural.replace(/([a-z])([A-Z])/g, '$1 $2')}',
  endpoint: '/api/${key}',
  fields: [
${fields.map((f) => `    { name: '${f.camel}', label: '${f.label}'${f.ui !== 'text' ? `, type: '${f.ui}'` : ''}${f.required ? ', required: true' : ''} },`).join('\n')}
  ],
};

export default ${key};
`,
};

for (const rel of Object.keys(files)) {
  if (existsSync(join(root, rel))) {
    console.error(`Refusing to overwrite existing ${rel}`);
    process.exit(1);
  }
}
for (const [rel, content] of Object.entries(files)) {
  writeFileSync(join(root, rel), content);
  console.log(`created  ${rel}`);
}

const indexPath = join(root, 'web/src/resources/index.ts');
const index = readFileSync(indexPath, 'utf8')
  .replace('// @scaffold:imports', `import ${key} from './${key}';\n// @scaffold:imports`)
  .replace('  // @scaffold:list', `  ${key},\n  // @scaffold:list`);
writeFileSync(indexPath, index);
console.log('updated  web/src/resources/index.ts');
console.log(`\nRestart the API, then open http://localhost:5173/${key}`);
