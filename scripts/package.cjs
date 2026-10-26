const fs = require('node:fs');
const path = require('node:path');
const { crc32 } = require('./binary.cjs');
const root = path.resolve(__dirname, '..');
const files = ['manifest.json','popup.html','demo.html','ui.css','privacy.html','privacy.css','src/parser.js','src/content.js','src/popup.js','icons/icon16.png','icons/icon48.png','icons/icon128.png'];
const entries = [], central = [];
let offset = 0;
for (const file of files) {
  const data = fs.readFileSync(path.join(root, file));
  const name = Buffer.from(file);
  const checksum = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x5d21, 12); // Stable ZIP date: 2026-09-01.
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  entries.push(local, name, data);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
  directory.writeUInt16LE(0x5d21, 14);
  directory.writeUInt32LE(checksum, 16);
  directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(data.length, 24);
  directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
  central.push(directory, name);
  offset += local.length + name.length + data.length;
}
const listing = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(listing.length, 12); end.writeUInt32LE(offset, 16);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const target = path.join(root, 'dist', `color-picker-${version}.zip`);
fs.writeFileSync(target, Buffer.concat([...entries, listing, end]));
console.log(`Packaged ${files.length} runtime files: ${target}`);
