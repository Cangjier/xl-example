// xl:title Object.defineProperty：value / enumerable
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperty(o, "x", { value: 1, enumerable: true });
Object.defineProperty(o, "y", { value: 2, enumerable: false });
console.log(o.x, o.y, Object.keys(o).join(","), JSON.stringify(o));
