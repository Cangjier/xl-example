// xl:title 展开实参 + `as`：首位那一格（第 724 轮收掉的根）
// xl:round 724
// xl:judge stdout
// xl:end
const xs: any = [1, 2, 3];
function rest(...a: any[]) { return "rest " + a.length + ":" + a.join("|"); }
function fixed(a: any, b: any, c: any) { return "fixed " + a + ":" + b + ":" + c; }
function mixed(a: any, ...r: any[]) { return "mixed " + a + ":" + r.length + ":" + r.join("|"); }
console.log(rest(...xs));
console.log(rest(...[1, 2, 3] as any));
console.log(fixed(...[1, 2, 3] as any));
console.log(mixed(...[1, 2, 3] as any));
console.log(mixed(...xs as any));
console.log(rest(1, ...xs));
