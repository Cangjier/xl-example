// xl:title Array.prototype.with 越界抛 RangeError
// xl:round 647
// xl:judge stdout
// xl:end

const xs = [1, 2, 3];
try { xs.with(3, 0); } catch (e) { console.log(e instanceof RangeError, e.name); }
try { xs.with(-4, 0); } catch (e) { console.log(e instanceof RangeError, e.name); }
console.log(JSON.stringify(xs.with(1.0, 9)));
