// xl:title new Array 的三种形态：空、长度、元素列表
// xl:judge stdout
// xl:end

const a = new Array();
const b = new Array(3);
const c = new Array(1, 2);
console.log(a.length, b.length, b.join("|"), c.length, c.join(","));
console.log(Array.isArray(a), Array.isArray(b));
