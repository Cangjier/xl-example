// xl:title Array.entries / keys / values（含**洞逐格走**、与 for..of 解构）
// xl:judge stdout
// xl:end

console.log([...["a", "b"].entries()].map((p) => p[0] + "=" + p[1]).join(","));
console.log([...[10, 20].keys()].join(","));
console.log([...[10, 20].values()].join(","));
const sparse: any[] = [1, , 3];
console.log([...sparse.keys()].join(","), [...sparse.values()].join(","), [...sparse.entries()].length);
for (const [i, v] of [7, 8].entries()) console.log(i, v);
console.log(Array.from([1, 2].values()).join("-"));
