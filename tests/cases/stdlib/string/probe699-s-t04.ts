// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); console.log(show("abc".replace("b", "$x")) + "|" + show("abc".replace("b", "$")));
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
console.log(show("abc".replace("b", "$x")) + "|" + show("abc".replace("b", "$")));
