// xl:title Boolean(x)：每个类型各一档
// xl:judge stdout
// xl:end

console.log(Boolean(0), Boolean(1), Boolean(""), Boolean("0"), Boolean(null), Boolean(undefined));
console.log(Boolean(NaN), Boolean([]), Boolean({}), Boolean(new Boolean(false) as any));
