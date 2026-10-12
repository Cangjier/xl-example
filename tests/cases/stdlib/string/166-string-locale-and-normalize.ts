// xl:title `String.prototype` 上那些没装的成员现在的样子
// xl:round 691
// xl:judge stdout
// xl:end
const names: string[] = ["normalize", "localeCompare", "toLocaleUpperCase", "trimStart"];
for (const n of names) console.log(n, typeof (String.prototype as any)[n]);
