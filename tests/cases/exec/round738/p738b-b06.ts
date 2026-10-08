// xl:title 模板串插值里的逻辑链
// xl:round 738
// xl:judge stdout
// xl:end
const a: any = 0;
const b: any = 1;
console.log("v=" + (a || b) + " w=" + (a && b));
console.log("x=" + (a ?? "n") + " y=" + (b && "m"));
const s = (v: any) => "s:" + (v && "yes");
console.log(s(1), s(0));
