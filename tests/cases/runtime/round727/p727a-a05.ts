// xl:title `void` 与其它前缀词并排 / 嵌套
// xl:round 727
// xl:judge stdout
// xl:end
console.log(void void 0);
async function h(): Promise<any> { return await void { z: 1 }; }
h().then((v: any) => console.log("h", v));
console.log(typeof void { q: 1 });
console.log(!void [9]);
