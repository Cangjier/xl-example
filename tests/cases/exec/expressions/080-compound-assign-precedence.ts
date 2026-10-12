// xl:title 复合赋值的右操作数取整个赋值右侧（比自己松的那一段也算）
// xl:round 373
// xl:judge stdout
// xl:end
// **复合赋值右侧是一个完整的 AssignmentExpression**——三元、比自己松的算术、
// 比自己紧的算术，三种都要落对。
const flag = true;
let a = 2; a *= 1 + 2; console.log("A mul-of-sum", a);
let b = 10; b -= 1 + 2; console.log("B sub-of-sum", b);
let c = 1; c += flag ? 2 : 3; console.log("C add-of-ternary", c);
let d = 1; d += 1 < 2 ? 4 : 5; console.log("D add-of-cmp-ternary", d);
let e = 2; e **= 2 + 1; console.log("E pow-of-sum", e);
let f = 8; f /= 1 + 1; console.log("F div-of-sum", f);
let g = "x"; g += flag ? "y" : "z"; console.log("G concat-of-ternary", g);
let h = 1; h += 2 + 3 + 4; console.log("H chain", h);
let i = 1; i += 2 * 3; console.log("I tighter", i);
let j = 1; j *= 2 + 3; console.log("J mul-then-add", j);
let k = 1; k += (2 + 3) * 2; console.log("K paren", k);
let m = 5; m %= 2 + 1; console.log("M mod-of-sum", m);
let n = 1; n += 1; console.log("N plain", n);
let p = 1; p += -2; console.log("P unary", p);
console.log("Q", a, b, c, d, e, f, g, h, i, j, k, m, n, p);
