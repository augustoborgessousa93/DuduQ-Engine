export const normalizeFrameName = (name) => String(name ?? "").normalize("NFKC").trim().toLowerCase().replace(/[—–-]/g,"-").replace(/\s*\/\s*/g,"/").replace(/\s+/g," ");
const frames = (page) => (page?.root?.children || page?.children || []).filter((node) => /frame|board/i.test(node.type || "") || node.width > 0 && node.height > 0);
export function resolvePenpotFrame({ document, fileId, pageId, frameId, frameName, aliases=[] }) {
  if (fileId && document?.id && document.id !== fileId) throw Error("PENPOT_FILE_NOT_FOUND");
  const page = (document?.pages || []).find((item) => item.id === pageId) || (document?.id === pageId ? document : null);
  if (!page) throw Error("PENPOT_PAGE_NOT_FOUND");
  const nodes = frames(page), exact = frameName && nodes.filter((n) => n.name === frameName), alias = nodes.filter((n) => aliases.includes(n.name));
  let found = frameId ? nodes.find((n) => n.id === frameId) : null, mode = found ? "EXPLICIT_ID" : null;
  if (!found) { const candidates = exact.length ? exact : alias.length ? alias : nodes.filter((n) => [frameName,...aliases].map(normalizeFrameName).includes(normalizeFrameName(n.name))); if (candidates.length !== 1) throw Error(candidates.length ? `PENPOT_FRAME_AMBIGUOUS:${JSON.stringify(candidates.map(({id,name,width,height})=>({id,name,width,height})) )}` : "PENPOT_FRAME_NOT_FOUND"); found=candidates[0]; mode=exact.length?"DISCOVERED_EXACT":alias.length?"DISCOVERED_ALIAS":"DISCOVERED_NORMALIZED"; }
  return { fileId, pageId, frameId:found.id, frameName:found.name, width:found.width, height:found.height, resolutionMode:mode };
}
