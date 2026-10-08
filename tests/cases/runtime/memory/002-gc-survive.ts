// xl:title 跨过回收还活着的对象：句柄稳定、内容不丢
// xl:judge stdout
// xl:end

const keep: any[] = [];
for (let i = 0; i < 200; i++) keep.push({ i, text: "v" + i });
for (let i = 0; i < 20000; i++) { const junk = [i]; }
console.log(keep.length, keep[0].text, keep[199].i, keep[100].text);
