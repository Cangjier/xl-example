// xl:title Symbol.toPrimitive：hint 取 default / number / string 三条路
// xl:round 7
// xl:judge stdout
// xl:end

const o = {
  [Symbol.toPrimitive](hint: string) { return hint === "number" ? 1 : hint === "string" ? "s" : "d"; },
};
console.log(o + "", +o, `${o}`, o == 1, String(o));
