// xl:title 抛出去时迭代器的 return 也会被调
// xl:round 683
// xl:judge stdout
// xl:end
const log: string[] = [];
const it: any = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 5 ? { value: i++, done: false } : { value: undefined, done: true }), return(v: any) { log.push('closed'); return { value: v, done: true }; } }; } };
try { for (const v of it) { if (v === 1) throw new Error('boom'); } } catch (e: any) { log.push('caught:' + e.message); }
console.log(log.join(','));
