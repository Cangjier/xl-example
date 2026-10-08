// xl:title every / some / filter / find 在空数组与洞上的口径
// xl:round 371
// xl:judge stdout
// xl:end
console.log(([] as number[]).every((v) => v > 0), ([] as number[]).some((v) => v > 0));
console.log([1, 2].every(Boolean), [0, 1].some(Boolean));
console.log(JSON.stringify([1, , 3].filter((v: number) => v > 1)));
console.log([1, , 3].find((v: number) => v === undefined), [1, , 3].findIndex((v: number) => v === undefined));
