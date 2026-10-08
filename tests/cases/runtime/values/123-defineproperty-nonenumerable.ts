// xl:title `defineProperty` 的 `enumerable: false` 不进 `Object.keys`，但读得到
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
Object.defineProperty(o, "hidden", { value: 2, enumerable: false });
console.log(o.hidden, Object.keys(o).join(","), JSON.stringify(o));
