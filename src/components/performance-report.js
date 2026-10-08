import { NOTES, noteLabel } from "../music.js";
import { reportAdvice } from "../song-performance.js";
import { icon } from "./icons.js";

export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const metric = (label, value, description) => `<div class="report-metric"><span>${label}</span><strong>${value === null ? "—" : value}<small>${value === null ? "" : "%"}</small></strong><p>${description}</p></div>`;
export function performanceReport(report, actions = true) {
  const signal = report.score !== null;
  const grade = !signal ? "数据不足" : !report.completed ? "未完成演奏" : report.score >= 90 ? "表现出色" : report.score >= 75 ? "稳步进阶" : report.score >= 60 ? "继续巩固" : "从慢速开始";
  return `<article class="performance-report" aria-label="专业演奏报告">
    <div class="report-heading"><div><span class="section-kicker">${icon("chart")} 演奏分析 · ${report.completed ? "完整演奏" : "提前结束"}</span><h2>${escapeHTML(report.title)}<span>演奏报告</span></h2><p>${new Date(report.at).toLocaleString("zh-CN")} · ${escapeHTML(report.key)} 调 · ${report.bpm} BPM · A4 ${report.reference} Hz · 容差 ±${report.tolerance} 音分</p></div><div class="report-total"><strong>${signal ? report.score : "—"}</strong><span>${grade}${signal ? " · / 100" : ""}</span></div></div>
    <div class="report-metrics">${metric("音准命中率", signal ? report.accuracy : null, "整段有效评估时间中落在容差内的比例")}${metric("起音节奏", signal ? report.rhythm : null, "在目标起拍附近识别到正确起音的音符比例")}${metric("音高稳定度", report.stability, "音符持续段内的音高波动，排除起音与收音过渡")}${metric("吹奏覆盖率", report.coverage, "识别到有效音高的时间比例")}</div>
    <div class="report-facts"><span>平均偏差 <b>${report.bias === null ? "—" : `${report.bias > 0 ? "+" : ""}${report.bias} 音分`}</b></span><span>未识别音符 <b>${report.missed} / ${report.rows.length}</b></span><span>演奏进度 <b>${Math.round(report.elapsed/report.duration*100)}%</b></span></div>
    <div class="report-body"><section><h3>逐句复盘</h3><div class="phrase-results">${report.phrases.map((p) => `<div><span>${escapeHTML(p.label)}<small>第 ${p.from}–${p.to} 个音</small></span><div class="phrase-meter"><i style="width:${p.accuracy}%"></i></div><b>${p.accuracy}%</b></div>`).join("")}</div><p class="report-hint">绿条为本句音准命中率，漏吹和断档会降低结果。</p></section><section class="report-advice"><h3>下一次，重点练这些</h3><ol>${reportAdvice(report).map((text) => `<li>${escapeHTML(text)}</li>`).join("")}</ol></section></div>
    <details class="report-detail"><summary>查看逐音分析 · ${report.rows.length} 个音</summary><div class="report-table-wrap"><table><thead><tr><th>音符</th><th>音准</th><th>覆盖</th><th>平均偏差</th><th>波动 σ</th><th>起音偏差</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${r.index+1} · ${noteLabel(NOTES.find((n) => n.id === r.id))}</td><td>${r.accuracy}%</td><td>${r.coverage}%</td><td>${r.bias === null ? "—" : `${r.bias > 0 ? "+" : ""}${r.bias} 音分`}</td><td>${r.spread === null ? "—" : `${r.spread} 音分`}</td><td>${r.onset === null ? "未识别" : `${r.onset > 0 ? "+" : ""}${r.onset} ms`}</td></tr>`).join("")}</tbody></table></div></details>
    <p class="report-method">评分：音准 50% + 起音节奏 20% + 吹奏覆盖 20% + 稳定度 10%（按音准折算）。静音与采样断档不计成绩，节拍声屏蔽窗口不计入评估。起音由音高变化或重新发声估算，同音连奏可能无法识别；结果受设备延迟、噪声和拾音影响，供练习参考。仅分析单音音高与时序，不能判断姿势、指法动作、音色或专业演奏等级。</p>
    ${actions ? `<div class="report-actions"><button class="button button-outline" data-action="karaoke-export" data-report="${escapeHTML(report.id)}">${icon("book")} 导出演奏报告</button><span data-save-status>报告已保存在本机 · 最近 20 份</span></div>` : ""}
  </article>`;
}

export function exportPerformanceReport(report) {
  const style = `body{font:15px/1.7 "Microsoft YaHei",sans-serif;color:#263d33;max-width:1050px;margin:40px auto;padding:0 24px}h2{font-size:28px}h2 span{font-size:18px;margin-left:14px}h3{font-size:18px}.report-heading,.report-facts{display:flex;justify-content:space-between;gap:20px}.report-total{display:grid;text-align:center}.report-total strong{font-size:60px;color:#527943}.report-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.report-metric{padding:16px;background:#f3f6ee;border-radius:12px}.report-metric strong{display:block;font-size:32px}.report-metric p,.report-method,.report-hint{font-size:12px;color:#66735e}.report-facts{margin:20px 0;padding:16px;background:#f7f8f3}.phrase-results>div{display:flex;gap:20px;align-items:center;margin:12px 0}.phrase-results span{width:260px}.phrase-results small{display:block}.phrase-meter{flex:1;background:#edf1e5;height:8px}.phrase-meter i{display:block;background:#527943;height:100%}table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.icon{display:none}details{margin:24px 0}details>summary{display:none}@media print{body{margin:0}tr,.report-metric{break-inside:avoid}}`;
  const html = `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(report.title)} · 笛伴演奏报告</title><style>${style}</style><body>${performanceReport(report, false).replace('<details class="report-detail">','<details class="report-detail" open>')}<p>笛伴 DiziMate · 在浏览器中打印可保存为 PDF</p></body></html>`;
  const url = URL.createObjectURL(new Blob([html], {type:"text/html;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.title}-演奏报告-${new Date(report.at).toISOString().slice(0,10)}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
