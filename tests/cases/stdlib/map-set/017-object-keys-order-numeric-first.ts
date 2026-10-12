// xl:title Object.keys / values / entries 的键序：整数键在前且升序
// xl:judge stdout
// xl:end

const o: any = { b: 2, 2: "two", a: 1, 1: "one", 10: "ten" };
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(JSON.stringify(Object.entries(o)));
