// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show("abc".includes("b", undefined)) + "|" + show("abc".startsWith("b", undefined)));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show("abc".includes("b", undefined)) + "|" + show("abc".startsWith("b", undefined)));
