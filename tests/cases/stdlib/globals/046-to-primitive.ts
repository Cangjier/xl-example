// xl:title 对象转原始值：valueOf / toString / Symbol.toPrimitive 的次序
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = {
  valueOf() { return 2; },
  toString() { return "s"; },
};
console.log(o + 1, `${o}`, o * 2);
const p: any = { [Symbol.toPrimitive](h: string) { return h === "number" ? 5 : "P"; } };
console.log(p + 1, `${p}`);
