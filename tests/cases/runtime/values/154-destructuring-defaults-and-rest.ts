// xl:title 解构的默认值只在严格 undefined 时生效；剩余收尾
// xl:round 323
// xl:judge stdout
// xl:end

const [a = 1, b = 2, c = 3] = [undefined, null, 0];
const { x = 1, y = 2, ...rest } = { x: undefined, y: 5, z: 6, w: 7 };
console.log(a, b, c, x, y, Object.keys(rest).join(","));
