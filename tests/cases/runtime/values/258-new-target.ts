// xl:title new.target：直接调用与 new 调用
// xl:round 9
// xl:judge stdout
// xl:end

function F(this: any) {
  if (new.target === undefined) { console.log("plain"); return; }
  console.log("new", new.target.name);
}
F();
new (F as any)();
