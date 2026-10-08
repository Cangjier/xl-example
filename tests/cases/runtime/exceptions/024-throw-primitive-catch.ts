// xl:title 抛原始值：字符串与数字都要被 catch 接住
// xl:round 323
// xl:judge stdout
// xl:end

function f(kind: string) {
  if (kind === "s") throw "boom";
  if (kind === "n") throw 42;
  return "ok";
}
for (const k of ["s", "n", "x"]) {
  try { console.log(k, f(k)); } catch (e) { console.log(k, "caught", e); }
}
