// xl:title 自定义迭代器被 for-of / 展开 / 解构共用
// xl:round 683
// xl:judge stdout
// xl:end
function makeIter() { let i = 0; return { [Symbol.iterator]() { return this; }, next() { return i < 3 ? { value: i++, done: false } : { value: undefined, done: true }; } }; }
try { console.log("forof", String((() => { let out = ''; for (const v of makeIter() as any) out += v; return out; })())); } catch (e) { console.log("forof", "ERR", String(e && e.name)); }
try { console.log("spread", String([...(makeIter() as any)].join(','))); } catch (e) { console.log("spread", "ERR", String(e && e.name)); }
try { console.log("destructure", String((() => { const [a, b] = makeIter() as any; return a + ':' + b; })())); } catch (e) { console.log("destructure", "ERR", String(e && e.name)); }
