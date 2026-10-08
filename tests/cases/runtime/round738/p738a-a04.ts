// xl:title `typeof` / `void` / `!` / `delete` 后面跟逻辑运算符
// xl:round 738
// xl:judge stdout
// xl:end
const o: any = { a: 1, b: 2 };
console.log(typeof o.a && "T", typeof o.zzz || "F");
console.log(void 0 || "V", !o.a && "N");
console.log(delete o.a && "D", JSON.stringify(o));
console.log((typeof o.b) && "P", !(o.b) || "Q");
