// xl:title 解构的默认值与嵌套 + 重命名
// xl:round 623
// xl:judge stdout
// xl:end

const { a = 1, b: { c = 2 } = {}, d: e = 3 } = { b: {} } as any;
console.log(a, c, e);
const [p = 10, [q = 20] = []] = [] as any;
console.log(p, q);
