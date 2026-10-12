// xl:title 按宽度折行：split / 累加 / padEnd
// xl:round 682
// xl:judge stdout
// xl:end
const words = 'the quick brown fox jumps over the lazy dog'.split(' ');
const lines: string[] = [];
let line = '';
for (const w of words) { if (line.length > 0 && line.length + 1 + w.length > 12) { lines.push(line); line = w; } else { line = line.length === 0 ? w : line + ' ' + w; } }
if (line.length > 0) lines.push(line);
for (const l of lines) console.log(l.padEnd(13, '.') + '|');
