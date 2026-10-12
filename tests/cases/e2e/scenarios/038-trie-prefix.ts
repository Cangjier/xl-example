// xl:title 前缀树：插入 / 查询 / 前缀收集
// xl:round 330
// xl:judge stdout
// xl:end

class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}
class Trie {
  root = new TrieNode();
  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (next === undefined) {
        next = new TrieNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    node.isWord = true;
  }
  has(word: string): boolean {
    let node = this.root;
    for (const ch of word) {
      const next = node.children.get(ch);
      if (next === undefined) return false;
      node = next;
    }
    return node.isWord;
  }
  withPrefix(prefix: string): string[] {
    let node = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (next === undefined) return [];
      node = next;
    }
    const found: string[] = [];
    const walk = (at: TrieNode, sofar: string): void => {
      if (at.isWord) found.push(sofar);
      for (const [ch, child] of at.children) walk(child, sofar + ch);
    };
    walk(node, prefix);
    return found.sort();
  }
}
const trie = new Trie();
for (const w of ["cat", "car", "card", "dog", "do"]) trie.insert(w);
console.log(trie.has("car"), trie.has("ca"), trie.has("dog"));
console.log(trie.withPrefix("ca").join(","));
console.log(trie.withPrefix("z").length);
