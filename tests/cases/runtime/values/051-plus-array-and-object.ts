// xl:title `+` 的 ToPrimitive：数组拼逗号、对象给 [object Object]
// xl:judge stdout
// xl:end

console.log([1, 2] + [3], [] + {}, ({}) + "", 1 + [2], "x" + [1, 2]);
console.log({ valueOf: () => 7 } + 1, { toString: () => "T" } + "!");
