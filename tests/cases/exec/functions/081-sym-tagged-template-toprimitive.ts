// xl:title ToPrimitive 与 Symbol.toPrimitive
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = {
  [Symbol.toPrimitive](hint: string) {
    return hint === "number" ? 42 : "str";
  },
};
console.log(o + 1, `${o}`, String(o));
