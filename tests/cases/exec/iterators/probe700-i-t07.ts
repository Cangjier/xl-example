// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const it = (function* () { yield 1; yield 2; return 3; })(); console.log(show(it.next().value) + "|" + show(it.next().value) + "
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const it = (function* () { yield 1; yield 2; return 3; })();
console.log(show(it.next().value) + "|" + show(it.next().value) + "|" + show(it.next().value) + "|" + show(it.next().done));
