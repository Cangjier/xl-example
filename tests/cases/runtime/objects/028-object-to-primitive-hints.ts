// xl:title ToPrimitive 的三种 hint 与顺序
// xl:round 371
// xl:judge stdout
// xl:end
const log: string[] = [];
const o = {
  valueOf() { log.push("valueOf"); return 1; },
  toString() { log.push("toString"); return "T"; },
};
console.log(o + 1, log.join(","));
log.length = 0;
console.log(String(o), log.join(","));
log.length = 0;
console.log(Number(o), log.join(","));
log.length = 0;
console.log(`${o}`, log.join(","));
const onlyValue = { valueOf() { return 5; } };
console.log(onlyValue + "", String(onlyValue), Number(onlyValue));
