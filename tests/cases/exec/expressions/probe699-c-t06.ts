// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); const s = new String("ab"); console.log(show(s + "") + "|" + show(s.length) + "|" + show(s == "ab") + "|" + show(typeof s));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
const s = new String("ab");
console.log(show(s + "") + "|" + show(s.length) + "|" + show(s == "ab") + "|" + show(typeof s));
