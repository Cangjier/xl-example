// xl:title Array.flatMap
// xl:judge stdout
// xl:end

console.log([1, 2].flatMap((v) => [v, v * 10]).join(","));
console.log(["a b", "c"].flatMap((s) => s.split(" ")).join("|"));
