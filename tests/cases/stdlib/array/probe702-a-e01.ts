// xl:title 数组方法的实参过 ToNumber（对象 / 数字串）：slice / at / fill / indexOf
// xl:round 702
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log("[1,2,3,4].slice({valueOf:()=>1}) -> " + [1, 2, 3, 4].slice({ valueOf: () => 1 }).join(","));
console.log("[1,2,3,4].slice(1,'3') -> " + [1, 2, 3, 4].slice(1, "3").join(","));
console.log("[1,2,3].at({valueOf:()=>2}) -> " + show([1, 2, 3].at({ valueOf: () => 2 })));
console.log("[1,2,3].indexOf(2,{valueOf:()=>1}) -> " + show([1, 2, 3].indexOf(2, { valueOf: () => 1 })));
console.log("[1,2,3].fill(9,'1') -> " + [1, 2, 3].fill(9, "1").join(","));
