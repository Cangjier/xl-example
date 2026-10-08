// xl:title Symbol() 的 description / 唯一性 / 当键
// xl:judge stdout
// xl:end

const s1 = Symbol("tag");
const s2 = Symbol("tag");
console.log(s1 === s2, String(s1.description));
const o: any = {};
o[s1] = 1;
console.log(o[s1], Object.keys(o).length);
