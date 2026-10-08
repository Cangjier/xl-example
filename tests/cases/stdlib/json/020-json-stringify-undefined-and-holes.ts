// xl:title JSON.stringify 遇到 undefined / 函数 / 洞
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { a: undefined, b: () => 1, c: 1, d: null };
console.log(JSON.stringify(o));
console.log(JSON.stringify([undefined, () => 1, 1, null]));
console.log(JSON.stringify(undefined), JSON.stringify(() => 1), JSON.stringify(null));
