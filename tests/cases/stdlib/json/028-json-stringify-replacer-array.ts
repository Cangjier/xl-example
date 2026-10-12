// xl:title JSON.stringify 的 replacer 数组：挑键与嵌套
// xl:round 323
// xl:judge stdout
// xl:end

const o = { a: 1, b: { a: 2, c: 3 }, c: 4 };
console.log(JSON.stringify(o, ["a", "b"]));
console.log(JSON.stringify(o, ["a", "c"]));
