// xl:title length 的写：截断、放大成洞、非法值抛错
// xl:round 371
// xl:judge stdout
// xl:end
const xs = [1, 2, 3, 4];
xs.length = 2;
console.log(JSON.stringify(xs), xs.length);
xs.length = 4;
console.log(JSON.stringify(xs), xs.length, 2 in xs);
try { xs.length = -1; } catch (e) { console.log((e as Error).name); }
try { xs.length = 1.5; } catch (e) { console.log((e as Error).name); }
