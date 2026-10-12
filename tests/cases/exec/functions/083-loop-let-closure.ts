// xl:title let 循环变量：每次迭代一个绑定
// xl:round 681
// xl:judge stdout
// xl:end
const fs: any = [];
for (let i = 0; i < 3; i++) fs.push(() => i);
const vs: any = [];
for (var j = 0; j < 3; j++) vs.push(() => j);
try { console.log("let", String(fs.map((g: any) => g()).join(','))); } catch (e) { console.log("let", "ERR", String(e && e.name)); }
try { console.log("var", String(vs.map((g: any) => g()).join(','))); } catch (e) { console.log("var", "ERR", String(e && e.name)); }
