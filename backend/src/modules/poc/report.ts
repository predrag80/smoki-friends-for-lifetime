import { failureReasons, periodStats, variantStats, type PocAttempt, type PocPerson, type PocRun } from "./results.js";

const periodLabel = { YESTERDAY: "Juče", TODAY: "Danas", SOMEDAY: "Sutra" } as const;

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function seconds(value: number | null): string {
  return value === null ? "–" : `${value.toFixed(1)} s`;
}

function card(personName: string, item: PocAttempt): string {
  const key = `${personName}/${item.id}`;
  const media =
    item.status === "ok" && item.imageFile
      ? `<a href="${esc(item.imageFile)}" target="_blank"><img src="${esc(item.imageFile)}" loading="lazy" alt=""></a>` +
        (item.videoFile ? `<a class="video" href="${esc(item.videoFile)}" target="_blank">▶ Živa fotografija</a>` : "")
      : `<div class="fail"><strong>${item.status === "blocked" ? "Blokirano" : "Greška"}</strong><span>${esc(item.code)}</span><small>${esc(item.detail)}</small></div>`;
  const rating = (field: string, label: string) =>
    `<label>${label}<select data-key="${esc(key)}" data-field="${field}"><option value="">–</option>${[1, 2, 3, 4, 5]
      .map((score) => `<option>${score}</option>`)
      .join("")}</select></label>`;
  return `<article class="card ${item.status}" data-period="${item.period}">
  <div class="media">${media}</div>
  <div class="meta">${item.variant ? `<span class="badge">Varijanta ${esc(item.variant)}</span>` : ""}<b>${periodLabel[item.period]} · ${item.targetAge} god.</b><span>${esc(item.sceneTitle)}</span>
  <small>${item.status === "ok" ? seconds(item.ms / 1000) : ""}${item.attempts > 1 ? ` · ${item.attempts} pokušaja` : ""}${item.likeness ? ` · AI sličnost <b>${item.likeness}/10</b>` : ""}</small></div>
  ${item.status === "ok"
    ? `<div class="rate">${rating("identity", "Lice")}${rating("realism", "Realizam")}${rating("smoki", "Smoki")}
  <label class="wide">Greške / napomena<input data-key="${esc(key)}" data-field="note" placeholder="ruke, tekst, lica u pozadini…"></label></div>`
    : ""}
  <details><summary>Prompt</summary><p>${esc(item.prompt)}</p></details>
</article>`;
}

/** Same scene side by side for every variant (comparison runs) or a plain grid (single-variant runs). */
function personBody(person: PocPerson, compare: boolean): string {
  if (!compare) return `<div class="grid">${person.attempts.map((item) => card(person.name, item)).join("")}</div>`;
  const caseKey = (item: PocAttempt) => `${item.period}-${item.targetAge}-${item.sceneId}`;
  const keys = [...new Set(person.attempts.map(caseKey))];
  const portraits = (person.portraits ?? [])
    .map((portrait) =>
      portrait.status === "ok" && portrait.file
        ? `<figure><img src="${esc(portrait.file)}" alt=""><figcaption>${esc(portrait.variant)} · ${portrait.targetAge} god.</figcaption></figure>`
        : `<figure class="fail"><figcaption>${esc(portrait.variant)} · ${portrait.targetAge} god.: ${esc(portrait.detail)}</figcaption></figure>`
    )
    .join("");
  return (
    (person.traits ? `<p class="traits"><b>Crte lica:</b> ${esc(person.traits)}</p>` : "") +
    (portraits ? `<div class="portraits"><h3>Portreti u ciljanim godinama (korak 1)</h3><div class="strip">${portraits}</div></div>` : "") +
    keys
      .map((key) => {
        const items = person.attempts.filter((item) => caseKey(item) === key);
        const first = items[0];
        return `<div class="case" data-period="${first.period}"><h3>${periodLabel[first.period]} · ${first.targetAge} god. · ${esc(first.sceneTitle)}</h3>
  <div class="grid">${items.map((item) => card(person.name, item)).join("")}</div></div>`;
      })
      .join("")
  );
}

/** Self-contained HTML report; ratings are stored in the browser and exported as CSV. */
export function buildReport(run: PocRun): string {
  const stats = periodStats(run);
  const reasons = failureReasons(run);
  const compare = (run.variants?.length ?? 0) > 1;
  const vStats = variantStats(run);
  const people = run.people
    .map(
      (person) => `<section class="person">
  <header>${person.sourceFile ? `<img class="source" src="${esc(person.sourceFile)}" alt="">` : ""}
  <div><h2>${esc(person.name)}</h2><p>${person.currentAge} god. · provera lica: ${person.faceCheck === "ok" ? "prošla" : `<b class="bad">${esc(person.faceCheck)}</b>`}</p></div></header>
  ${personBody(person, compare)}
</section>`
    )
    .join("");

  const rows = run.people.flatMap((person) =>
    person.attempts.map((item) => ({
      person: person.name, currentAge: person.currentAge, period: item.period, targetAge: item.targetAge,
      scene: item.sceneId, variant: item.variant ?? "", likeness: item.likeness ?? "", status: item.status,
      code: item.code ?? "", detail: item.detail ?? "", seconds: (item.ms / 1000).toFixed(1), key: `${person.name}/${item.id}`
    }))
  );

  return `<!doctype html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SFFL test — ${esc(run.runId)}</title>
<style>
:root{--red:#c8102e;--deep:#7a1115;--yellow:#ffd533;--ink:#241c1c;--paper:#fffaf0;--line:#ead9c4}
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--paper)}
main{max-width:1280px;margin:0 auto;padding:24px 16px 64px}h1{margin:0 0 4px;color:var(--deep)}
.sub{color:#6b5a50;margin:0 0 20px}table{border-collapse:collapse;width:100%;background:#fff;margin:8px 0 20px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left}th{background:var(--deep);color:#fff}
.summary{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(380px,1fr))}.summary>div{overflow-x:auto}.summary>div:first-child{grid-column:1/-1}
.summary th,.summary td{white-space:nowrap}.media{position:relative}
.video{position:absolute;left:10px;bottom:10px;background:var(--yellow);color:var(--deep);font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px;text-decoration:none}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 24px;position:sticky;top:0;background:var(--paper);padding:8px 0;z-index:2}
button{font:inherit;border:0;border-radius:999px;padding:8px 16px;background:var(--yellow);color:var(--deep);font-weight:700;cursor:pointer}
button.off{background:#eee;color:#555}.person{border-top:3px solid var(--red);padding-top:16px;margin-top:28px}
.person header{display:flex;gap:16px;align-items:center}.person h2{margin:0}.source{width:96px;height:128px;object-fit:cover;border-radius:10px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));margin-top:14px}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.card img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;background:#eee}
.fail{aspect-ratio:3/4;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;background:#fbe9e9;color:var(--deep);text-align:center;padding:12px}
.meta{padding:10px 12px 0;display:flex;flex-direction:column}.meta small{color:#7b6b60}
.rate{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:8px 12px}.rate label{font-size:12px;display:flex;flex-direction:column}
.rate .wide{grid-column:1/-1}.rate input,.rate select{font:inherit;padding:4px;border:1px solid var(--line);border-radius:6px}
details{padding:0 12px 10px;font-size:12px;color:#6b5a50}
.badge{display:inline-block;align-self:flex-start;background:var(--deep);color:var(--yellow);font-weight:700;font-size:12px;padding:2px 8px;border-radius:999px;margin-bottom:4px}
.case{margin-top:18px}.case h3{margin:0;font-size:16px;color:var(--deep)}.traits{font-size:13px;color:#6b5a50;margin:10px 0 0}
.portraits h3{font-size:15px;margin:14px 0 6px}.strip{display:flex;gap:10px;flex-wrap:wrap}.strip figure{margin:0;width:120px}
.strip img{width:120px;aspect-ratio:3/4;object-fit:cover;border-radius:8px;display:block}.strip figcaption{font-size:12px;color:#6b5a50}.bad{color:var(--red)}.hidden{display:none}
</style></head><body><main>
<h1>Probni test generisanja</h1>
<p class="sub">Run ${esc(run.runId)} · provajder ${esc(run.provider)} · model ${esc(run.imageModel)} · region ${esc(run.location)} · pakovanje: ${run.productReference ? esc(run.productReference) : "bez reference"} · ${run.people.length} osoba · ${esc(run.startedAt)}${run.finishedAt ? ` – ${esc(run.finishedAt)}` : " (u toku)"}</p>
<div class="summary">
${compare ? `<div><h3>Poređenje varijanti</h3><table><tr><th>Varijanta</th><th>Opis</th><th>Uspeh</th><th>AI sličnost</th><th>Prosek vremena</th></tr>
${vStats.map((row) => `<tr><td><b>${esc(row.variant)}</b></td><td>${esc(run.variantNotes?.[row.variant] ?? "")}</td><td>${row.ok}/${row.total}</td><td><b>${row.avgLikeness === null ? "–" : row.avgLikeness.toFixed(1)}</b> / 10</td><td>${seconds(row.avgSeconds)}</td></tr>`).join("")}
</table><p class="sub">Vreme kod C i D ne uključuje portret (korak 1), koji se pravi jednom po uzrastu i ponovo koristi.</p></div>` : ""}
<div><h3>Rezultat po periodu</h3><table><tr><th>Period</th><th>Pokušaja</th><th>Uspeh</th><th>Blok.</th><th>Greške</th><th>Prosek</th><th>p95</th></tr>
${stats.map((row) => `<tr><td>${periodLabel[row.period]}</td><td>${row.total}</td><td><b>${pct(row.successRate)}</b></td><td>${row.blocked}</td><td>${row.errors}</td><td>${seconds(row.avgSeconds)}</td><td>${seconds(row.p95Seconds)}</td></tr>`).join("")}
</table></div>
<div><h3>Razlozi neuspeha</h3><table><tr><th>Razlog</th><th>Broj</th></tr>
${reasons.length ? reasons.map((row) => `<tr><td>${esc(row.reason)}</td><td>${row.count}</td></tr>`).join("") : `<tr><td colspan="2">Nema</td></tr>`}
</table></div>
<div><h3>Prosečne ocene (1–5)</h3><table id="ratings"><tr><th>${compare ? "Varijanta" : "Period"}</th><th>Lice</th><th>Realizam</th><th>Smoki</th><th>Ocenjeno</th></tr></table></div>
</div>
<div class="toolbar">
<button data-filter="ALL">Sve</button><button class="off" data-filter="YESTERDAY">Juče</button><button class="off" data-filter="TODAY">Danas</button><button class="off" data-filter="SOMEDAY">Sutra</button>
<button id="export">Izvezi CSV sa ocenama</button>
</div>
${people}
</main>
<script>
const RUN = ${JSON.stringify(run.runId)};
const ROWS = ${JSON.stringify(rows).replace(/</g, "\\u003c")};
const STORE = "sffl-poc-ratings-" + RUN;
const GROUP_BY = ${JSON.stringify(compare ? "variant" : "period")};
const GROUPS = ${JSON.stringify(compare ? Object.fromEntries((run.variants ?? []).map((v) => [v, v])) : periodLabel)};
let ratings = {};
try { ratings = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) {}
function save() { try { localStorage.setItem(STORE, JSON.stringify(ratings)); } catch (e) {} renderAverages(); }
document.querySelectorAll("[data-key]").forEach((el) => {
  const value = (ratings[el.dataset.key] || {})[el.dataset.field];
  if (value !== undefined) el.value = value;
  el.addEventListener("change", () => { (ratings[el.dataset.key] ||= {})[el.dataset.field] = el.value; save(); });
});
function renderAverages() {
  const table = document.getElementById("ratings");
  table.querySelectorAll("tr:not(:first-child)").forEach((row) => row.remove());
  const labels = GROUPS;
  for (const period of Object.keys(labels)) {
    const scores = { identity: [], realism: [], smoki: [] };
    let rated = 0;
    for (const row of ROWS.filter((r) => r[GROUP_BY] === period && r.status === "ok")) {
      const r = ratings[row.key] || {};
      if (r.identity || r.realism || r.smoki) rated++;
      for (const field of Object.keys(scores)) if (r[field]) scores[field].push(Number(r[field]));
    }
    const avg = (list) => list.length ? (list.reduce((a, b) => a + b, 0) / list.length).toFixed(2) : "–";
    const tr = document.createElement("tr");
    tr.innerHTML = "<td>" + labels[period] + "</td><td>" + avg(scores.identity) + "</td><td>" + avg(scores.realism) + "</td><td>" + avg(scores.smoki) + "</td><td>" + rated + "</td>";
    table.appendChild(tr);
  }
}
renderAverages();
document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("off", b !== button));
  document.querySelectorAll(".card, .case").forEach((card) => card.classList.toggle("hidden", button.dataset.filter !== "ALL" && card.dataset.period !== button.dataset.filter));
}));
document.getElementById("export").addEventListener("click", () => {
  const head = ["person","currentAge","variant","period","targetAge","scene","status","code","detail","seconds","likeness","identity","realism","smoki","note"];
  const cell = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const lines = [head.join(",")].concat(ROWS.map((row) => {
    const r = ratings[row.key] || {};
    return head.map((h) => cell(h in r ? r[h] : row[h])).join(",");
  }));
  const blob = new Blob([lines.join("\\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sffl-poc-" + RUN + ".csv";
  link.click();
});
</script></body></html>`;
}
