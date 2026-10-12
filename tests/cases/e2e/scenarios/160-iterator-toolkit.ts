// xl:title 迭代器工具箱：map / filter / take / zip / cycle
// xl:round 371
// xl:judge stdout
// xl:end
function* map2<T, R>(it: Iterable<T>, fn: (v: T, i: number) => R): Generator<R> {
  let i = 0;
  for (const v of it) yield fn(v, i++);
}
function* filter2<T>(it: Iterable<T>, pred: (v: T) => boolean): Generator<T> {
  for (const v of it) if (pred(v)) yield v;
}
function* take2<T>(it: Iterable<T>, n: number): Generator<T> {
  let i = 0;
  for (const v of it) { if (i >= n) return; i += 1; yield v; }
}
function* naturals(): Generator<number> { let i = 0; while (true) yield i++; }
function* zip2<A, B>(a: Iterable<A>, b: Iterable<B>): Generator<[A, B]> {
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  for (;;) {
    const x = ia.next();
    const y = ib.next();
    if (x.done || y.done) return;
    yield [x.value, y.value];
  }
}
function* cycle2<T>(items: T[]): Generator<T> {
  while (items.length > 0) for (const v of items) yield v;
}
console.log([...take2(map2(naturals(), (v) => v * v), 5)].join(","));
console.log([...filter2(naturals(), (v) => v % 3 === 0).next().value ? [...take2(filter2(naturals(), (v) => v % 3 === 0), 4)] : []].join(","));
console.log([...zip2([1, 2, 3], ["a", "b"])].map((p) => p[0] + p[1]).join(","));
console.log([...take2(cycle2(["x", "y"]), 5)].join(""));
console.log([...take2(naturals(), 0)].length, [...map2([], (v: number) => v)].length);
