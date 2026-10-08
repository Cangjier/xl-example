// xl:title 把可迭代物展开进**对象**（`{...box}` 走的是属性枚举）
// xl:round 737
// xl:judge stdout
// xl:end
const box: any = { [Symbol.iterator]: function () { return { next: () => ({ value: 1, done: true }) }; }, a: 1 };
console.log(JSON.stringify({ ...box }));
const arr = [1, 2];
console.log(JSON.stringify({ ...arr }));
const s = { x: { y: 1 } };
console.log(JSON.stringify({ ...s, z: 2 }), JSON.stringify({ ...null, ...undefined } as any));
