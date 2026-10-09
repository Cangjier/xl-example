// xl:title 逗号表达式、void、delete 的求值顺序
// xl:round 9
// xl:judge stdout
// xl:end

let order: string[] = [];
function t(x: string, v: number) { order.push(x); return v; }
const r = (t("a", 1), t("b", 2), t("c", 3));
console.log(r, order.join(""));
const o: any = { p: 1 };
console.log(delete o.p, o.p, void 0);
