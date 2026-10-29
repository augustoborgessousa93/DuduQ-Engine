import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const manifest = readFileSync("dist-pages/.duduq-pages-manifest", "utf8").trimEnd().split(/\r?\n/);
assert.equal(manifest.length, 2673);
const entries = new Map(manifest.map(line => {
  const at = line.lastIndexOf(" ");
  return [line.slice(0, at), line.slice(at + 1)];
}));
assert.equal(entries.size, 2673, "no manifest duplicates");
const routes = [...entries.keys()].filter(p => p === "index.html" || p === "home/index.html" ||
  (p.startsWith("play/") && p.endsWith("/index.html")));
assert.equal(routes.length, 43);
const loader = '<script defer src="/core/duduq-header-title-fit-v24.js" data-duduq-header-title-fit="v24"></script>';
for (const p of routes) {
  const html = readFileSync("dist-pages/" + p, "utf8");
  assert.equal(html.split(loader).length, 2, "single V24 loader in " + p);
  assert.equal(sha(Buffer.from(html)), entries.get(p), "HTML manifest SHA in " + p);
}
for (const p of ["runtime/gold-masters/matching/index.html", "runtime/gold-masters/target-shooter/index.html"]) {
  assert.ok(!readFileSync("dist-pages/" + p, "utf8").includes(loader), "Gold Master intact");
}

const code = readFileSync("dist-pages/core/duduq-header-title-fit-v24.js", "utf8");
assert.equal(sha(Buffer.from(code)), entries.get("core/duduq-header-title-fit-v24.js"));
const hooks = {};
const attributes = {};
const styles = new Map();
const heading = {
 textContent:"", style:{setProperty:(k,v)=>styles.set(k,v), removeProperty:k=>styles.delete(k)},
 setAttribute:(k,v)=>attributes[k]=v,removeAttribute:k=>delete attributes[k]
};
const head = {children:[],appendChild(el){this.children.push(el);}};
const document = {
 head,documentElement:{},querySelector:selector=>selector.includes(".hud-title")?heading:null,
 createElement:()=>({id:"",textContent:""}),
 addEventListener:(name, fn)=>hooks[name]=fn
};
class MutationObserver { constructor(fn){hooks.change=fn} observe(root,options){hooks.observed=options;} }
const window = {addEventListener:(name,fn)=>hooks[name]=fn};
vm.runInNewContext(code, {document,window,MutationObserver});
assert.ok(hooks.observed.subtree && hooks.observed.characterData);
assert.equal(head.children.length,1,"one title-fit style");
assert.ok(head.children[0].textContent.includes("max-height:56px"));
assert.equal(window.__DUDUQ_HEADER_TITLE_FIT_V24__,true);
heading.textContent="Choices Around Me: Food, School and Preferences";
hooks.change();
assert.equal(heading.textContent,"Choices Around Me");
assert.equal(attributes["aria-label"],"Choices Around Me: Food, School and Preferences");
assert.equal(attributes.title,"Choices Around Me: Food, School and Preferences");
assert.equal(attributes["data-duduq-title-fit"],"compact");
assert.equal(styles.get("--duduq-title-fit-size"),"18px");
hooks.change(); // the observer must not consume its own title update
assert.equal(heading.textContent,"Choices Around Me");
heading.textContent="SHORT TITLE";
hooks.change();
assert.equal(heading.textContent,"SHORT TITLE");
assert.equal(attributes["data-duduq-title-fit"],undefined);
heading.textContent="Long descriptive topic without a colon that must not overflow";
hooks.change();
assert.equal(attributes["data-duduq-title-fit"],"dense");
assert.equal(attributes["aria-label"],heading.textContent);
assert.ok(Number.parseFloat(styles.get("--duduq-title-fit-size"))<=14);
vm.runInNewContext(code,{document,window,MutationObserver});
assert.equal(head.children.length,1,"idempotent initialization");
console.log("V24_TOPIC_COMPACT_FULL_ARIA_AND_TOOLTIP=PASS");
console.log("V24_ASYNC_TOPIC_AND_SHORT_TOPIC=PASS");
console.log("V24_OVERFLOW_FALLBACK=PASS");
console.log("V24_43_ROUTES_GOLD_MASTERS_UNCHANGED=PASS");
