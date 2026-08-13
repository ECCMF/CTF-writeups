import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const ignoredTopLevel = new Set([
  '.git',
  '.github',
  'node_modules'
]);

const entries = [];

async function walk(relativeDir = '') {
  const absoluteDir = path.join(root, relativeDir);
  const children = await readdir(absoluteDir, { withFileTypes: true });

  for (const child of children) {
    if (child.name.startsWith('.') && relativeDir === '') continue;
    if (relativeDir === '' && ignoredTopLevel.has(child.name)) continue;

    const relativePath = path.join(relativeDir, child.name);

    if (child.isDirectory()) {
      await walk(relativePath);
      continue;
    }

    if (!child.isFile() || child.name !== 'writeup.md') continue;

    const parts = relativePath.split(path.sep);
    if (parts.length < 2) continue;

    const site = parts[0];
    const parentParts = parts.slice(1, -1);
    const label = parentParts.length ? parentParts.join(' / ') : 'writeup.md';

    entries.push({
      site,
      label,
      path: relativePath.split(path.sep).join('/')
    });
  }
}

await walk();

entries.sort((a, b) =>
  a.site.localeCompare(b.site, undefined, { numeric: true }) ||
  a.label.localeCompare(b.label, undefined, { numeric: true })
);

await writeFile(
  path.join(root, 'manifest.json'),
  JSON.stringify(entries, null, 2) + '\n',
  'utf8'
);

console.log(`Wrote manifest.json with ${entries.length} Markdown page(s).`);
