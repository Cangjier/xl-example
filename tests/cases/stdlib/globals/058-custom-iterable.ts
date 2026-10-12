// xl:title 自定义可迭代物在四处的落点
// xl:round 683
// xl:judge stdout
// xl:end
const range: any = { from: 1, to: 3, [Symbol.iterator]() { let i = this.from; const to = this.to; return { next() { return i <= to ? { value: i++, done: false } : { value: undefined, done: true }; } }; } };
try { console.log("forof", String((() => { let out = ''; for (const v of range) out += v; return out; })())); } catch (e) { console.log("forof", "ERR", String(e && e.name)); }
try { console.log("spread", String([...range].join(','))); } catch (e) { console.log("spread", "ERR", String(e && e.name)); }
try { console.log("array-from", String(Array.from(range).join(','))); } catch (e) { console.log("array-from", "ERR", String(e && e.name)); }
try { console.log("destructure", String((() => { const [a, b] = range as any; return a + ':' + b; })())); } catch (e) { console.log("destructure", "ERR", String(e && e.name)); }
try { console.log("function-returns-iterable", String((() => { function f() { return range; } return [...f()].length; })())); } catch (e) { console.log("function-returns-iterable", "ERR", String(e && e.name)); }
