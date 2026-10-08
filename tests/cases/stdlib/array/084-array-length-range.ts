// xl:title `length` 的写：截断 / 放大成洞 / 非法值抛 RangeError
// xl:round 376
// xl:judge stdout
// xl:end
const xs: any[] = [1, 2, 3, 4];
xs.length = 2;
console.log("A", JSON.stringify(xs), xs.length);
xs.length = 4;
console.log("B", JSON.stringify(xs), xs.length, 2 in xs);
try { xs.length = -1; } catch (e) { console.log("C", (e as Error).name); }
try { xs.length = 1.5; } catch (e) { console.log("D", (e as Error).name); }
try { xs.length = 4294967296; } catch (e) { console.log("E", (e as Error).name); }
console.log("F", xs.length);
const obj: any = { length: 3 };
console.log("G", obj.length, Array.from({ length: 3 }, (_v, i) => i).join(","));
