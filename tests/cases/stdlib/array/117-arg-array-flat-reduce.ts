// xl:title 参数位：flat 深度 / flatMap / reduceRight / Array.from 的映射
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("flat-1", String([1, [2, [3, [4]]]].flat())); } catch (e) { console.log("flat-1", "ERR", String(e && e.name)); }
try { console.log("flat-2", String([1, [2, [3, [4]]]].flat(2))); } catch (e) { console.log("flat-2", "ERR", String(e && e.name)); }
try { console.log("flat-0", String([1, [2]].flat(0))); } catch (e) { console.log("flat-0", "ERR", String(e && e.name)); }
try { console.log("flatMap", String([1, 2].flatMap((x) => [x, x * 2]))); } catch (e) { console.log("flatMap", "ERR", String(e && e.name)); }
try { console.log("reduceRight", String(['a', 'b', 'c'].reduceRight((acc, x) => acc + x, ''))); } catch (e) { console.log("reduceRight", "ERR", String(e && e.name)); }
try { console.log("from-length", String(Array.from({ length: 3 }, (v, i) => i * 2))); } catch (e) { console.log("from-length", "ERR", String(e && e.name)); }
try { console.log("from-string", String(Array.from('ab'))); } catch (e) { console.log("from-string", "ERR", String(e && e.name)); }
try { console.log("of", String(Array.of(1, 'a'))); } catch (e) { console.log("of", "ERR", String(e && e.name)); }
