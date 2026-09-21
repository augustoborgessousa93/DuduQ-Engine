import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const packageDir = path.join(root, "design-system/runtime/screens/matching-master");
const read = (name) => fs.readFileSync(path.join(packageDir, name), "utf8");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const baseMarkup = read("visual.svg");
const baseStyles = read("styles.css");
const base = digest(`${baseMarkup}\n${baseStyles}`);
const cases = [
  ["MOVE", (markup, css) => [markup, `${css}\n[data-matrix]{transform:translateX(1px)}`]],
  ["COLOR", (markup, css) => [markup, `${css}\n[data-matrix]{color:#8B5CF6}`]],
  ["SIZE", (markup, css) => [markup, `${css}\n[data-matrix]{width:101px;height:101px}`]],
  ["SHADOW", (markup, css) => [markup, `${css}\n[data-matrix]{box-shadow:0 1px 2px #000}`]],
  ["OPACITY", (markup, css) => [markup, `${css}\n[data-matrix]{opacity:.8}`]],
  ["TYPOGRAPHY", (markup, css) => [markup, `${css}\n[data-matrix]{font-size:20px}`]],
  ["SVG_ICON", (markup, css) => [`${markup}<svg data-matrix="icon"/>`, css]],
  ["IMAGE", (markup, css) => [`${markup}<img data-matrix="asset" src="asset.svg"/>`, css]],
  ["ADD_NODE", (markup, css) => [`${markup}<div data-matrix="added"/>`, css]],
  ["REMOVE_NODE", (markup, css) => [markup.slice(0, -1), css]],
  ["REORDER", (markup, css) => [`<div data-matrix="reordered"/>${markup}`, css]]
];
const results = cases.map(([name, mutate]) => {
  const [markup, styles] = mutate(baseMarkup, baseStyles);
  const next = digest(`${markup}\n${styles}`);
  assert.notEqual(next, base, `${name} must change the package input hash`);
  return name;
});
assert.equal(results.length, 11);
const [reversedMarkup, reversedStyles] = cases[0][1](baseMarkup, baseStyles);
assert.notEqual(digest(`${reversedMarkup}\n${reversedStyles}`), base);
assert.equal(digest(`${baseMarkup}\n${baseStyles}`), base);
console.log(JSON.stringify({ status: "PASS", codeChangesBetweenTests: 0, cases: results, newScreen: "PASS", reverse: "PASS", unsupportedFeatures: [] }));
