// xl:title 符号当键：读得到、不算进 keys / JSON
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { [s]: 1, a: 2 };
console.log(o[s], Object.keys(o).join(","), JSON.stringify(o));
console.log("a" in o, typeof s);
