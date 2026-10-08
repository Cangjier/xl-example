// xl:title 降级层：可选调用与实参短路
// xl:round 741
// xl:judge stdout
// xl:end
const log: string[] = [];
const o: any = null;
console.log(o?.m?.(log.push("x")), log.length);
