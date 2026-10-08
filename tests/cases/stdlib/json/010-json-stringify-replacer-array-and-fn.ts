// xl:title JSON.stringify 的 replacer：数组白名单与函数改写
// xl:judge stdout
// xl:end

const o = { a: 1, b: 2, c: 3 };
console.log(JSON.stringify(o, ["a", "c"]));
console.log(JSON.stringify(o, (k: string, v: any) => (k === "b" ? undefined : v)));
console.log(JSON.stringify({ x: { y: 1 } }, (k: string, v: any) => (k === "y" ? 9 : v)));
