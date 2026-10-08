// xl:title 解构默认值只认 `undefined`，`null` 不触发
// xl:round 691
// xl:judge stdout
// xl:end
const { a = 1, b = 2 } = { a: null, b: undefined } as any;
console.log(a, b);
const [x = 3, y = 4] = [undefined, null] as any;
console.log(x, y);
