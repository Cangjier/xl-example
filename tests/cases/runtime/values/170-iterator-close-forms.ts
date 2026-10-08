// xl:title `for..of` 提前退出的收尾：break / return / 正常跑完
// xl:round 336
// xl:judge stdout
// xl:end

function* gen(tag: string) {
  try { yield 1; yield 2; yield 3; } finally { console.log("close", tag); }
}
for (const v of gen("break")) { console.log("got", v); break; }
function viaReturn(): void {
  for (const v of gen("return")) { console.log("got", v); return; }
  console.log("after return");
}
viaReturn();
function take(): number {
  for (const v of gen("func")) { if (v === 2) return v; }
  return -1;
}
console.log("took", take());
for (const v of gen("full")) { console.log("v", v); }
console.log("done");
