// xl:title JSON.stringify 的 toJSON / undefined / 函数 / NaN 口径
// xl:judge stdout
// xl:end

const withToJson = { a: 1, toJSON() { return { replaced: true }; } };
console.log(JSON.stringify(withToJson));
console.log(JSON.stringify({ u: undefined, f: () => 0, n: NaN, i: Infinity }));
console.log(JSON.stringify([undefined, () => 0, NaN]), JSON.stringify(undefined), JSON.stringify(null));
