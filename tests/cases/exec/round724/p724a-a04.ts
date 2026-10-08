// xl:title 数组字面量元素上的 `...x as T`
// xl:round 724
// xl:judge stdout
// xl:end
const xs: any = [1, 2, 3];
console.log([...xs as any].join("|"));
console.log([...([1, 2] as any)].join("|"));
console.log([0, ...xs as any].length);
console.log([...xs as any, 9].join("|"));
