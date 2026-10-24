import { createHash } from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async p => JSON.parse(await readFile(path.join(root, p), "utf8"));
const hashFile = async p => createHash("sha256").update(await readFile(path.join(root, p))).digest("hex");
const date = "2026-10-20";
const officialLinksPath = `docs/qa/DUDUQ_ENGLISH_OFFICIAL_MODULE_LINKS_${date}.md`;
const routeManifestPath = `docs/qa/DUDUQ_ENGLISH_600_ACTIVITY_PRODUCTION_ROUTES_${date}.json`;
const curriculum = await read("content/english/master/curricular-master-v3.json");
const routes = await read(routeManifestPath);
const linksMarkdown = await readFile(path.join(root, officialLinksPath), "utf8");
const linkPattern = /^- \[Módulo (\d{2}) — (.+?)\]\((https:\/\/[^)]+)\)$/gm;
const officialLinks = [...linksMarkdown.matchAll(linkPattern)].map(match => ({ moduleNumber: Number(match[1]), linkTitle: match[2], url: match[3] }));
if (officialLinks.length !== 30) throw new Error(`OFFICIAL_LINKS_COUNT:${officialLinks.length}`);

const sortedModules = [...curriculum.modules].sort((a, b) => a.year - b.year || a.moduleNumber - b.moduleNumber);
if (sortedModules.length !== 30 || routes.activityCount !== 600) throw new Error(`MASTER_COUNTS:${sortedModules.length}/${routes.activityCount}`);
const collectionName = "EduQ Play — Língua Inglesa — Conteúdos Gamificados (DUDUQ English)";
const items = [];
for (let index = 0; index < sortedModules.length; index++) {
  const module = sortedModules[index];
  const year = Number(module.year);
  const moduleNumber = Number(module.moduleNumber);
  const linked = officialLinks[index];
  if (linked.moduleNumber !== moduleNumber || linked.linkTitle !== module.title) throw new Error(`OFFICIAL_TITLE_LINK_MISMATCH:${module.id}`);
  const coverPath = `assets/EduQ Play_ ${year}º Ano.png`;
  const coverStat = await stat(path.join(root, coverPath)).catch(() => null);
  const cover = coverStat ? {
    localPath: coverPath,
    sha256: await hashFile(coverPath),
    sourceStatus: "AVAILABLE_APPROVED_YEAR_COVER_LOCAL",
    platformUploadStatus: "PENDING_SOURCE_INTEGRATION"
  } : {
    localPath: coverPath,
    sha256: null,
    sourceStatus: "COVER_ASSET_PENDING",
    platformUploadStatus: "PENDING_SOURCE_INTEGRATION"
  };
  items.push({
    stableId: `DUDUQ-EN-Y${year}-M${String(moduleNumber).padStart(2, "0")}`,
    platformRecordId: null,
    year,
    yearLabel: `${year}º ANO`,
    subject: "LÍNGUA INGLESA",
    moduleNumber,
    officialModuleTitle: module.title,
    collection: collectionName,
    authorOrProvider: "DUDUQ English",
    productionUrl: linked.url,
    cover,
    contentType: "GAME / EXTERNAL IFRAME",
    displayOrder: index + 1,
    status: "IMPORT_READY_PLATFORM_SOURCE_ACCESS_REQUIRED",
    studentAccess: true,
    iframeTag: linked.url,
    requiredPlatformTag: "Língua Inglesa",
    duplicateChecks: { moduleId: module.id, exactUrl: linked.url, titleYearModule: `${module.title}|${year}|${moduleNumber}` },
    activityRouteCount: routes.activities.filter(item => item.module === module.id).length
  });
}
const yearCounts = Object.fromEntries([1, 2, 3, 4, 5].map(year => [String(year), items.filter(item => item.year === year).length]));
if (Object.values(yearCounts).some(count => count !== 6) || new Set(items.map(item => item.productionUrl)).size !== 30) throw new Error("LIBRARY_MANIFEST_INVARIANT_FAILURE");

const manifest = {
  feature: "DUDUQ_EDUQ_PLAY_OFFICIAL_LIBRARY_IMPORT",
  generatedAt: new Date().toISOString(),
  humanAuthority: "AUGUSTO",
  status: "IMPORT_READY_PLATFORM_SOURCE_ACCESS_REQUIRED",
  collection: { stableId: "EDUQ-PLAY-DUDUQ-ENGLISH", name: collectionName, subject: "LÍNGUA INGLESA", contentType: "Gamified external games", status: "NOT_CREATED_IN_PLATFORM" },
  sourceAuthority: { productionLinks: officialLinksPath, activityRoutes: routeManifestPath, curriculum: "content/english/master/curricular-master-v3.json", urlsGeneratedFromAssumptions: false },
  platformDiscovery: { productionOriginObserved: "https://eduqbrasil.com.br", libraryAdminObserved: "https://eduqbrasil.com.br/library/collections", externalGameFormObserved: "https://eduqbrasil.com.br/library/medias/new?collection_id=42", sourceRepository: null, blocker: "EDUQ_PLAY_SOURCE_ACCESS_REQUIRED" },
  counts: { total: items.length, yearCounts, duplicateUrls: 0, activityRoutesCovered: routes.activityCount },
  items
};
await writeFile(path.join(root, `docs/qa/DUDUQ_EDUQ_PLAY_LIBRARY_MANIFEST_${date}.json`), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const catalog = ["# DUDUQ English no EduQ Play — Catálogo de Importação", "", `Status: pacote pronto para importação; integração efetiva bloqueada por acesso ao source/config do EduQ Play.`, `Coleção proposta: **${collectionName}**.`, "", "Os títulos e links vêm dos artefatos oficiais do currículo e de produção. A mesma capa aprovada do ano está mapeada para seus seis módulos; nenhum asset novo foi gerado.", ""];
for (let year = 1; year <= 5; year++) {
  catalog.push(`## ${year}º ANO`, "");
  for (const item of items.filter(entry => entry.year === year)) {
    const coverStatus = item.cover.sha256 ? `capa local disponível (${item.cover.localPath}; upload pendente)` : "COVER_ASSET_PENDING";
    catalog.push(`${String(item.moduleNumber).padStart(2, "0")}. **${item.officialModuleTitle}** — [Abrir módulo](${item.productionUrl}) — ${coverStatus}`);
  }
  catalog.push("");
}
catalog.push(`**Total: ${items.length} módulos (6 por ano).**`, "");
await writeFile(path.join(root, `docs/qa/DUDUQ_EDUQ_PLAY_LIBRARY_CATALOG_${date}.md`), catalog.join("\n"), "utf8");

const discovery = {
  feature: "DUDUQ_EDUQ_PLAY_INTEGRATION_DISCOVERY",
  generatedAt: new Date().toISOString(),
  authority: "AUGUSTO",
  result: "EDUQ_PLAY_SOURCE_ACCESS_REQUIRED",
  localSearch: {
    duduqWorkspace: root,
    eduqPlaySourceRepositoryFound: false,
    inspectedLocations: [
      "C:/Users/augus/Downloads/workspace (DUDUQ Engine only)",
      "C:/Users/augus/Downloads/EduQ Brasil_files (saved site assets/build resources, not source repository)",
      "C:/Users/augus/Downloads/workspace-chatgpt-test (DUDUQ test workspace)",
      "C:/Users/augus/Projetos/Portal-Ferramentas-Pedagogicas (static prototype; README states no database or activity engine)"
    ]
  },
  liveRuntimeDiscovery: {
    productionOriginObserved: "https://eduqbrasil.com.br",
    authenticatedAdminSessionObserved: true,
    libraryRoute: "/library/collections",
    libraryCollectionCountObserved: 75,
    existingDuduqCollectionSearch: "NO_MATCH",
    observedCreateCollectionRoute: "/library/collections/new",
    collectionFormFieldsObserved: ["name", "author", "cover image upload", "AI enabled", "media by type"],
    observedGameMediaRoute: "/library/medias/new?collection_id=42",
    observedExternalGameSchema: ["type=Jogos", "name", "author", "collection", "description", "student permission", "required tags", "required iframe tag/URL", "cover image upload", "school-year permissions"],
    observedSubjectTag: "Língua Inglesa",
    observedEmbedModel: "iframe-backed game media indicated by required iframe-tag field; actual DUDUQ embed not tested",
    productionDeploymentWorkflow: "NOT_EXPOSED_IN_LOCAL_SOURCE",
    integrationWritesPerformed: false
  },
  approvedCoverAssets: [1, 2, 3, 4, 5].map(year => ({ year, path: `assets/EduQ Play_ ${year}º Ano.png`, sha256: manifest.items.find(item => item.year === year).cover.sha256, uploadStatus: "PENDING_PLATFORM_SOURCE_INTEGRATION" })),
  blockers: ["EDUQ_PLAY_SOURCE_ACCESS_REQUIRED"],
  nextAction: "Provide the EduQ Play source repository/workspace path (or its approved integration/deployment connector) so the native library adapter, cover upload and actual embedded-runtime QA can be implemented and verified without guessing the platform backend."
};
await writeFile(path.join(root, `docs/qa/DUDUQ_EDUQ_PLAY_INTEGRATION_DISCOVERY_${date}.json`), `${JSON.stringify(discovery, null, 2)}\n`, "utf8");

const qa = `# DUDUQ English × EduQ Play — Integration QA (${date})\n\n` +
`## Result\n\n**BLOCKED: EDUQ_PLAY_SOURCE_ACCESS_REQUIRED.** The source repository and versioned library config were not found in accessible local workspaces. The logged-in admin site was inspected read-only; no collection/media was created, no image uploaded and no platform setting changed.\n\n` +
`## Architecture discovered\n\nEduQ Brasil at https://eduqbrasil.com.br exposes a server-backed library admin UI. The collections screen showed 75 existing collections; filtering for DUDUQ returned no match. The create-collection form accepts a name, author, cover upload and media selections. The game-media form identifies external games as type “Jogos” and requires a name, author, tags and an “iframe tag” URL; it also exposes a collection relation, student permission, cover upload and school-year permissions. The backend/database/API schema, client source, build workflow and deployment workflow are not exposed in the accessible source workspace. The live form is not a substitute for the missing source/config needed for reproducible integration.\n\n` +
`## Import package\n\nPrepared ${items.length} idempotent candidate records from the official links document and curricular master. Year distribution is 6 each across Years 1–5, duplicate URLs 0, and the official link identity/title was cross-checked with the master. The five approved local year covers are present and hashed; each is mapped to its six modules, with upload pending. The import manifest uses the existing observed game-media fields and subject tag “Língua Inglesa”.\n\n` +
`## Validation\n\n- Official production link artifact: 30 entries; previous DUDUQ production certification records 30/30 HTTP 200 and runtime initialization.\n- Current actual EduQ library click-through: NOT RUN — no records were added.\n- Actual student-facing iframe, cross-origin headers, fullscreen/audio permissions, interaction, sidebar resize, tablet and zero-scroll: NOT RUN — no DUDUQ entry exists in the platform to launch.\n- EduQ platform build/deployment: NOT RUN — source and release workflow unavailable.\n- DUDUQ engine/canonical/Smart Sentence: unchanged by this integration-preparation work.\n\n` +
`## Safe rollback\n\nNo platform changes have been made, so there is nothing to roll back. After import, use the EduQ library admin’s normal recoverable archive/remove flow for the single DUDUQ collection and its 30 game media records; do not delete or alter any DUDUQ production assets/deployment. Before rollback, export the collection/media IDs and confirm the platform’s restore/trash behavior. DUDUQ production remains independent.\n\n` +
`## Artifacts\n\n- Discovery: \`docs/qa/DUDUQ_EDUQ_PLAY_INTEGRATION_DISCOVERY_${date}.json\`\n- Import manifest: \`docs/qa/DUDUQ_EDUQ_PLAY_LIBRARY_MANIFEST_${date}.json\`\n- Catalog: \`docs/qa/DUDUQ_EDUQ_PLAY_LIBRARY_CATALOG_${date}.md\`\n- Official URLs: \`${officialLinksPath}\`\n- Activity routes: \`${routeManifestPath}\`\n`;
await writeFile(path.join(root, `docs/qa/DUDUQ_EDUQ_PLAY_INTEGRATION_QA_${date}.md`), qa, "utf8");

const rollback = `# EduQ Play DUDUQ Collection — Safe Rollback (${date})\n\nNo collection or game-media record has been created yet. If/when the import is performed, rollback should use the EduQ Play admin’s normal archive/soft-delete mechanism for the dedicated DUDUQ collection and its 30 associated game records, then verify the collection no longer appears to students. First preserve the platform record IDs/export for audit and check the admin’s restore/trash behavior. Do not purge records unless separately authorized. Never touch the independent DUDUQ Engine Cloudflare deployment or its assets.\n`;
await writeFile(path.join(root, `docs/qa/DUDUQ_EDUQ_PLAY_ROLLBACK_GUIDE_${date}.md`), rollback, "utf8");

console.log(JSON.stringify({ status: "PREPARED_BLOCKED", count: items.length, yearCounts, duplicateUrls: items.length - new Set(items.map(item => item.productionUrl)).size, coversPresent: items.filter(item => item.cover.sha256).length, activities: routes.activityCount, blocker: discovery.result }, null, 2));
