// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); function* g() { try { yield 1; yield 2; } finally { log.push("cleanup"); } } const log = []; const it = g(); it.next(); it.retur
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
function* g() { try { yield 1; yield 2; } finally { log.push("cleanup"); } }
const log = [];
const it = g();
it.next();
it.return(7);
console.log(log.join(",") + "|" + show(it.next().done));
