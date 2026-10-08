// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); let closed = 0; const iterable = { [Symbol.iterator]() { let i = 0; return { next: () => ({ value: i++, done: i > 3 }), return:
// xl:round 700
// xl:judge stdout
// xl:end
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
