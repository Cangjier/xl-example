// xl:title toString(radix)：2 / 8 / 16 / 36 / 越界
// xl:round 371
// xl:judge stdout
// xl:end
console.log((255).toString(16), (255).toString(2), (8).toString(8), (35).toString(36));
console.log((-255).toString(16), (0.5).toString(2));
try { (1).toString(1); } catch (e) { console.log((e as Error).name); }
try { (1).toString(37); } catch (e) { console.log((e as Error).name); }
console.log((1.5).toString(), (1e21).toString(), (1e-7).toString());
