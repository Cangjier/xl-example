// xl:title 写明 `{ value: undefined }` 与压根不写是两档
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { a: 1 };
Object.defineProperty(o, "a", { value: undefined });
console.log("a" in o, o.a, Object.keys(o).join(","));
