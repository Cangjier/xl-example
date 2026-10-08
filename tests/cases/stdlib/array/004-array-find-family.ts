// xl:title Array.find / findIndex / some / every（谓词族）
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.find((v) => v > 2), xs.find((v) => v > 9));
console.log(xs.findIndex((v) => v > 2), xs.findIndex((v) => v > 9));
console.log(xs.some((v) => v > 3), xs.every((v) => v > 0), [].every((v: any) => false));
