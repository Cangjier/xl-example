// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const s = "abc"; console.log(show(s.replace("b", (m, off, whole) => m + "|" + off + "|" + whole)));
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const s = "abc";
console.log(show(s.replace("b", (m, off, whole) => m + "|" + off + "|" + whole)));
