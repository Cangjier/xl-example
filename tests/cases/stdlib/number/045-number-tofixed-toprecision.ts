// xl:title toFixed / toPrecision / toExponential 的取舍与边界
// xl:round 371
// xl:judge stdout
// xl:end
console.log((1.005).toFixed(2), (2.5).toFixed(0), (-1.5).toFixed(0), (0).toFixed(3));
console.log((123.456).toPrecision(4), (0.000123).toPrecision(2));
console.log((12345).toExponential(2), (0.5).toExponential());
try { (1).toFixed(101); } catch (e) { console.log((e as Error).name); }
