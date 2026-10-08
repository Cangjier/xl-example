// xl:title `satisfies` 与括号化那一档：同一件事的两种排版
// xl:round 724
// xl:judge stdout
// xl:end
const xs: any = [1, 2, 3];
function f(...a: any[]) { return a.length + ":" + a.join("|"); }
console.log(f(...xs satisfies any));
console.log(f(...([1, 2, 3] as any)));
console.log(f(...([1, 2] satisfies any)));
console.log(f(...(xs as any)));
console.log(f(...(xs as any).slice(0, 2)));
