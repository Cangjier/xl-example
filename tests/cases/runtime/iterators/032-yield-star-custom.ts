// xl:title yield* 一个自定义可迭代物与一个生成器
// xl:round 683
// xl:judge stdout
// xl:end
function* inner() { yield 1; yield 2; return 'done'; }
function* outer() { const r = yield* inner(); yield 'after-' + r; }
try { console.log("delegate", String([...outer()].join(','))); } catch (e) { console.log("delegate", "ERR", String(e && e.name)); }
const custom: any = { [Symbol.iterator]() { let i = 0; return { next: () => (i < 2 ? { value: 'c' + i++, done: false } : { value: undefined, done: true }) }; } };
function* mixed() { yield* custom; yield 'end'; }
try { console.log("yield-star-iterable", String([...mixed()].join(','))); } catch (e) { console.log("yield-star-iterable", "ERR", String(e && e.name)); }
