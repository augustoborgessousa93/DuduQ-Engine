import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(p, 'utf8');

const loader = '<script defer src="/core/duduq-ebc-attribution-watermark.js" data-duduq-attribution-loader="v23"></script>';
const lines = read('dist-pages/.duduq-pages-manifest').trimEnd().split(/\r?\n/);
assert.equal(lines.length, 2672);
const targets = lines.map(x => x.slice(0, x.lastIndexOf(' ')))
  .filter(p => p === 'index.html' || p === 'home/index.html' || (p.startsWith('play/') && p.endsWith('/index.html')));
assert.equal(targets.length, 43);
let hits = 0;
for (const path of targets) {
 const contents = read('dist-pages/' + path);
 assert.equal(contents.split(loader).length, 2, 'must inject only once in ' + path);
 hits++;
}
for (const path of ['runtime/gold-masters/matching/index.html', 'runtime/gold-masters/target-shooter/index.html']) {
 assert.ok(!read('dist-pages/' + path).includes(loader), 'Gold Master untouched: ' + path);
}
const js = read('dist-pages/core/duduq-ebc-attribution-watermark.js');
const listeners = { document: {}, window: {} };
const element = type => ({
 type, children: [], dataset: {}, parentNode: null, appendChild(child) {
  if (child.parentNode) child.parentNode.children = child.parentNode.children.filter(x => x !== child);
  this.children.push(child);
  child.parentNode = this;
  return child;
 }, setAttribute(key, value) { this[key] = value; }
});
const game = element('game');
game.className = 'game-screen';
const document = {
 querySelector(selector) { return selector === '#game.game-screen' ? game : null; },
 head: element('head'), documentElement: element('html'), body: element('body'),
 fullscreenElement: null, createElement: element,
 createTextNode(value) { return {type:'text',textContent:value}; },
 addEventListener(name, callback) { listeners.document[name] = callback; }
};
const window = {addEventListener(name, callback) {listeners.window[name]=callback;}};
vm.runInNewContext(js, {document, window});
assert.equal(window.__DUDUQ_EBC_ATTRIBUTION_ACTIVE__, true);
const footer = game.children.find(x => x.dataset?.duduqAttribution === 'ebc-2026');
assert.ok(footer,'footer exists');
assert.equal(footer.children[0].textContent,'© 2026 Copyright | Desenvolvido por ');
assert.equal(footer.children[1].textContent,'Editora Brasil Cultural');
assert.equal(footer.children[1].href,'https://brasilcultural.com.br/');
assert.equal(footer.children[1].rel,'noopener noreferrer');
assert.equal(footer.children[1].target,'_blank');
const css = document.head.children.find(x => x.type === 'style').textContent;
assert.match(css,/pointer-events:none !important/);
assert.match(css,/pointer-events:auto !important/);
assert.match(css,/position:fixed !important/);
assert.match(css,/z-index:0 !important/);
assert.match(css,/\.game-screen > \.duduq-ebc-attribution \{z-index:-1 !important;\}/);
assert.match(css,/:has\\(\\.feedback-ribbon:not\\(\\[hidden\\]\\)\\)/);
assert.ok(css.includes("html:has(.feedback-ribbon:not([hidden]):not([aria-hidden='true'])) .duduq-ebc-attribution"));
assert.match(css,/visibility:hidden !important;opacity:0 !important;pointer-events:none !important/);
assert.doesNotMatch(css,/2147483000/);
assert.match(css,/left:50% !important/);
assert.match(css,/bottom:calc\(4px/);
assert.match(css,/@media\(max-width:480px\)/);
const full = element('game');
document.fullscreenElement = full;
listeners.document.fullscreenchange();
assert.equal(footer.parentNode,full,'show on fullscreen game root');
document.fullscreenElement = null;
listeners.document.fullscreenchange();
assert.equal(footer.parentNode,game,'restore to game layer behind UI');
game.children = [];
footer.parentNode = null;
listeners.document.DOMContentLoaded();
assert.equal(footer.parentNode,game,'reattach after game was rebuilt');
document.querySelector = () => null;
listeners.window.pageshow();
assert.equal(footer.parentNode,document.body,'fallback on screens without game root');
vm.runInNewContext(js, {document,window});
assert.equal(document.body.children.filter(x => x.dataset?.duduqAttribution === 'ebc-2026').length,1,'never duplicate');
console.log('V23_EBC_WATERMARK_TEXT_LINK=PASS');
console.log('V23_EBC_WATERMARK_GAME_NONBLOCKING=PASS');
console.log('V23_EBC_WATERMARK_FULLSCREEN=PASS');
console.log('V23_EBC_WATERMARK_SMALL_SCREEN=PASS');
console.log('V23_EBC_WATERMARK_OFFICIAL_SCREENS=PASS:'+hits);
console.log('V23_EBC_GOLD_MASTERS_IMMUTABLE=PASS');
