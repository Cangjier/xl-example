// xl:title `for..of`：解构 / 内建迭代器 / 提前退出 / 内建迭代器的值
// xl:round 700
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = [1, 2, 3].entries(); return it.next().value.join(':'); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { for (const { a } of [{ a: 1 }, { a: 2 }]) { } return 'ok'; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; for (const [k, v] of new Map([[1, 'a']])) s += k + v; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let n = 0; for (const x of [1, 2, 3]) { if (x === 2) break; n++; } return n; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = ['a', 'b'].values(); return it.next().value + it.next().value; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
let closed = 0;
const iterable = {
  [Symbol.iterator]() {
    let i = 0;
    return {
      next: () => ({ value: i++, done: i > 3 }),
      return: () => { closed++; return { done: true }; },
    };
  },
};
for (const x of iterable) { if (x === 1) break; }
console.log(show(closed));
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const [a, b] = new Set([1, 2]);
console.log(show(a) + "|" + show(b));
})();

(() => {
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const m = new Map([["a", 1], ["b", 2]]);
const out = [];
for (const [k, v] of m) out.push(k + v);
console.log(out.join(","));
})();
