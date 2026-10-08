// xl:title `sort` 把 `undefined` 放最后、洞再往后
// xl:round 305
// xl:judge stdout
// xl:end

const xs: any[] = [3, undefined, 1, , 2];
console.log(xs.sort().join(","), xs.length, 4 in xs);
