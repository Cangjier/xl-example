// xl:title Array.from：映射函数、类数组、可迭代、thisArg
// xl:round 371
// xl:judge stdout
// xl:end
console.log(Array.from("abc").join("-"));
console.log(Array.from({ length: 3, 0: "x" } as any).map((v: any) => String(v)).join(","));
console.log(Array.from([1, 2, 3], (v: number) => v * 2).join(","));
console.log(Array.from(new Set([1, 1, 2])).join(","));
console.log(Array.from({ length: 2 }, (_: unknown, i: number) => i).join(","));
