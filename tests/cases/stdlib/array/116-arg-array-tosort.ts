// xl:title 参数位：toSorted / with / toSpliced / toReversed
// xl:round 681
// xl:judge stdout
// xl:end
try { console.log("toSorted", String([3, 1, 2].toSorted())); } catch (e) { console.log("toSorted", "ERR", String(e && e.name)); }
try { console.log("toSorted-cmp", String([3, 1, 2].toSorted((x, y) => y - x))); } catch (e) { console.log("toSorted-cmp", "ERR", String(e && e.name)); }
try { console.log("with-1", String([1, 2, 3].with(1, 9))); } catch (e) { console.log("with-1", "ERR", String(e && e.name)); }
try { console.log("with--1", String([1, 2, 3].with(-1, 9))); } catch (e) { console.log("with--1", "ERR", String(e && e.name)); }
try { console.log("with-out", String([1, 2, 3].with(5, 9))); } catch (e) { console.log("with-out", "ERR", String(e && e.name)); }
try { console.log("toSpliced", String([1, 2, 3].toSpliced(1, 1, 'x'))); } catch (e) { console.log("toSpliced", "ERR", String(e && e.name)); }
try { console.log("toReversed", String([1, 2, 3].toReversed())); } catch (e) { console.log("toReversed", "ERR", String(e && e.name)); }
