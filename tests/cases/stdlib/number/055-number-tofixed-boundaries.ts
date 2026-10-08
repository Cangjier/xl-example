// xl:title Number.toFixed：进位边界、大数的位数、负数与 -0
// xl:judge stdout
// xl:end

console.log((1.005).toFixed(2), (2.5).toFixed(0), (-2.5).toFixed(0), (0).toFixed(2));
console.log((1e21).toFixed(2), (123.456).toFixed(0), (0.0001).toFixed(2));
try { (1).toFixed(101); } catch (e) { console.log("range:" + (e as Error).name); }
