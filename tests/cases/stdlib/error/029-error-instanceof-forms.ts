// xl:title Error 家族与 instanceof 的判定面
// xl:round 647
// xl:judge stdout
// xl:end

const kinds = [new Error("e"), new TypeError("t"), new RangeError("r"), { name: "Error" }, "x"];
for (const k of kinds) console.log(k instanceof Error);
console.log(new TypeError("t") instanceof Error, new Error("e") instanceof TypeError);
