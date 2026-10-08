// xl:title 数组解构的洞、默认值、剩余与嵌套
// xl:round 8
// xl:judge stdout
// xl:end

const [a, , b = 9, ...rest] = [1, 2, undefined, 4, 5];
const [[c], { d: { e } = {} }] = [[3], { d: { e: 7 } }];
console.log(a, b, rest, c, e);
