// xl:title parseInt 的基数与 Date 的七格都过 ToNumber
// xl:round 702
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show(parseInt("ff", "16" as any)));
console.log(show(parseInt("10", { valueOf: () => 2 } as any)));
console.log(show(new Date("2020" as any, 0, 2).getUTCFullYear()));
const d = new Date("2020-01-01T00:00:00.000Z");
d.setUTCFullYear("2021" as any);
console.log(show(d.getUTCFullYear()));
