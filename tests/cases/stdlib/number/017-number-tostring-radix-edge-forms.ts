// xl:title toString(radix) 在 2 / 8 / 16 / 36 与负数、小数上
// xl:judge stdout
// xl:end

console.log((255).toString(16), (255).toString(2), (255).toString(8), (35).toString(36));
console.log((-255).toString(16), (0).toString(2), (0.5).toString(2));
try { (1).toString(1); } catch (e: any) { console.log(e.name); }
