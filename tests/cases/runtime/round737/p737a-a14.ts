// xl:title 迭代协议不认时抛 `TypeError`（而不是静默给空）
// xl:round 737
// xl:judge stdout
// xl:end
for (const bad of [1, {}, null, undefined]) {
  try { for (const _ of bad as any) { console.log("never"); } console.log("no-throw"); }
  catch (e: any) { console.log("throw", e.constructor.name); }
}
try { [...(1 as any)]; } catch (e: any) { console.log("spread", e.constructor.name); }
