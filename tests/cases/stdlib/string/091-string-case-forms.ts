// xl:title toUpperCase / toLowerCase / toLocale* 的边界
// xl:round 371
// xl:judge stdout
// xl:end
console.log("aBc".toUpperCase(), "AbC".toLowerCase());
console.log("ß".toUpperCase(), "İ".toLowerCase().length);
console.log("abc".toLocaleUpperCase(), "ABC".toLocaleLowerCase());
