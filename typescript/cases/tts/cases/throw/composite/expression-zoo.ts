const base = { a: 1, b: [2, 3] as number[], c: { d: "x" } };
const {
  a,
  b: [first, ...rest],
  c: { d },
} = base;
const arr = [...base.b, 4, 5];
const obj = { ...base, e: true };
const fn = (x: number) => (y: number) => x + y;
const value = obj.a ?? 0;
const length = base.c?.d.length ?? 0;
const text = `a=${a}, first=${first}, rest=${rest.length}, d=${d}, len=${length}, v=${value}`;
console.log(text, arr, fn(1)(2), obj.e);
