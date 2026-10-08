// xl:title 解构剩余与默认值一起用
// xl:round 691
// xl:judge stdout
// xl:end
const [a, ...rest] = [1, 2, 3];
console.log(a, JSON.stringify(rest));
const { x, ...others } = { x: 1, y: 2, z: 3 } as any;
console.log(x, JSON.stringify(others));
const [p = 9] = [] as any;
console.log(p);
