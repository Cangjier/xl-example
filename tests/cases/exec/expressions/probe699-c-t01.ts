// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const order = []; const o = { [Symbol.toPrimitive]: (hint) => { order.push(hint); return 1; } }; const a = o + 1; const b = o ==
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const order = [];
const o = { [Symbol.toPrimitive]: (hint) => { order.push(hint); return 1; } };
const a = o + 1;
const b = o == 1;
const c = String(o);
console.log(order.join(",") + "|" + show(a) + "|" + show(b) + "|" + show(c));
