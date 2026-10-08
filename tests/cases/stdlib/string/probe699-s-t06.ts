// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show("abc".replaceAll("", "-")) + "|" + show("abc".replace("", "-")));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show("abc".replaceAll("", "-")) + "|" + show("abc".replace("", "-")));
