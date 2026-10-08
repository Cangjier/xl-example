// xl:title Object.create 串三层：读沿链走、keys 只看自己
// xl:judge stdout
// xl:end

const base = { a: 1 };
const mid: any = Object.create(base);
mid.b = 2;
const leaf: any = Object.create(mid);
leaf.c = 3;
console.log(leaf.a, leaf.b, leaf.c);
console.log(Object.keys(leaf).join(","), "a" in leaf, leaf.hasOwnProperty("a"), leaf.hasOwnProperty("c"));
