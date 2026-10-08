// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const o = { [Symbol.toPrimitive]: () => { throw new RangeError("no"); } }; try { const x = o + 1; console.log(show(x)); } catch
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const o = { [Symbol.toPrimitive]: () => { throw new RangeError("no"); } };
try { const x = o + 1; console.log(show(x)); } catch (e) { console.log("throw:" + e.constructor.name); }
