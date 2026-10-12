// xl:title String.indexOf / lastIndexOf / includes / charAt / charCodeAt
// xl:round 676
// xl:judge stdout
// xl:end

const s = "banana";
console.log(s.indexOf("an"), s.indexOf("an", 2), s.indexOf("z"), s.lastIndexOf("an"));
console.log(s.includes("nan"), s.includes("nan", 3), s.charAt(1), s.charAt(99));
console.log(s.charCodeAt(0), Number.isNaN(s.charCodeAt(99)));
