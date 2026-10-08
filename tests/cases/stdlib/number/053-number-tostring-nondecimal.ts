// xl:title Number.prototype.toString 的非十进制：2 / 8 / 16 / 36 与非法 radix
// xl:judge stdout
// xl:end

console.log((255).toString(16), (8).toString(2), (64).toString(8), (35).toString(36));
console.log((0.5).toString(2), (-255).toString(16), (0).toString(2));
try { (1).toString(1); } catch (e) { console.log("radix1:" + (e as Error).name); }
try { (1).toString(37); } catch (e) { console.log("radix37:" + (e as Error).name); }
