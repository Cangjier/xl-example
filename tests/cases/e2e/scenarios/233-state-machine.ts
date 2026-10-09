// xl:title 状态机：switch + 标签 + 对象表
// xl:round 681
// xl:judge stdout
// xl:end
const table: any = { idle: { go: 'run' }, run: { stop: 'idle', tick: 'run' } };
let state = 'idle';
const out: string[] = [];
for (const ev of ['go', 'tick', 'stop', 'nope']) { const next = (table[state] || {})[ev]; if (next === undefined) { out.push(state + '!'); continue; } state = next; out.push(state); }
console.log(out.join(' '));
