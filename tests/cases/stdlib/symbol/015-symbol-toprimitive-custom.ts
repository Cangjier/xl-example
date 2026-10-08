// xl:title Symbol.toPrimitive 决定三种 hint
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = {
  [Symbol.toPrimitive](hint: string) { return hint === "number" ? 42 : "str"; },
};
console.log(+o, o + "", String(o));
