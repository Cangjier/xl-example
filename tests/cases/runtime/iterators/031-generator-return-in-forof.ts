// xl:title for-of 里 break 会调 return（finally 照跑）
// xl:round 682
// xl:judge stdout
// xl:end
const seen: string[] = [];
function* g3() { try { yield 1; yield 2; yield 3; } finally { seen.push('cleanup'); } }
for (const v of g3()) { seen.push('v' + v); if (v === 2) break; }
try { console.log("trace", String(seen.join(','))); } catch (e) { console.log("trace", "ERR", String(e && e.name)); }
