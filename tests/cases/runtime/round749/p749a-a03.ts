// xl:title 自定义迭代器：`Symbol.iterator` 的三条写法与 `next` 的返回形状
// xl:round 749
// xl:judge stdout
// xl:end
const obj: any = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let cur = this.from;
    const last = this.to;
    return { next: () => (cur <= last ? { value: cur++, done: false } : { value: undefined, done: true }), };
  },
};
console.log([...obj].join(","), Array.from(obj).join(","));
const [a, b] = obj as any;
console.log(a, b);
const iterator = (obj as any)[Symbol.iterator]();
console.log(JSON.stringify(iterator.next()), JSON.stringify(iterator.next()), JSON.stringify(iterator.next()), JSON.stringify(iterator.next()));
