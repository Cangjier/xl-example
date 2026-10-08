// xl:title 迭代协议与生成器：手写可迭代对象 / `yield*` / 双向通信
// xl:round 746
// xl:judge stdout
// xl:end
const it = {
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 3 ? { value: i++, done: false } : { value: undefined, done: true }) };
  },
};
console.log([...it].join(","), JSON.stringify(Array.from(it)));
const [f, s] = it as any;
console.log(f, s);
function* inner() { yield 1; yield 2; }
function* outer() { const got = yield* inner(); yield got; }
console.log(JSON.stringify([...outer()]));
function* talk() { const sent = yield 1; yield sent * 2; }
const t = talk();
console.log(t.next().value, t.next(5).value);
const a = [1, 2, 3];
console.log(typeof a[Symbol.iterator], a[Symbol.iterator] === a.values);
const ai = a[Symbol.iterator]();
console.log(JSON.stringify(ai.next()), JSON.stringify(ai.next()));
const m = [1, 2, 3];
const out: number[] = [];
for (const v of m) { out.push(v); if (v === 1) m.push(9); }
console.log(out.join(","), m.length);
