// xl:title 把可迭代物展开进**对象**：走的是属性枚举，不是迭代协议
// xl:round 737
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p737b-b02`；正文一字未动）。
// 判定点只有一个：**对象展开的来路是属性枚举**——带 `Symbol.iterator` 的对象
// 按自己的可枚举字符串键展开（迭代器不参与）、数组按下标展开、
// 后来者覆盖先来者、`null` / `undefined` 直接跳过。
const box: any = { [Symbol.iterator]: function () { return { next: () => ({ value: 1, done: true }) }; }, a: 1 };
console.log(JSON.stringify({ ...box }));
const arr = [1, 2];
console.log(JSON.stringify({ ...arr }));
const s = { x: { y: 1 } };
console.log(JSON.stringify({ ...s, z: 2 }), JSON.stringify({ ...null, ...undefined } as any));
