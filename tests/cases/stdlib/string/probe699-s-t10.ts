// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show("abc".slice(undefined, undefined)) + "|" + show("abc".substring(undefined, 2)));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show("abc".slice(undefined, undefined)) + "|" + show("abc".substring(undefined, 2)));
