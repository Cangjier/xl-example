// xl:title Array.indexOf / includes（含 NaN 与 fromIndex）
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 2];
console.log(xs.indexOf(2), xs.indexOf(2, 2), xs.indexOf(9), xs.includes(3), xs.includes(9));
console.log([NaN].indexOf(NaN), [NaN].includes(NaN), ["a"].includes("a"));
