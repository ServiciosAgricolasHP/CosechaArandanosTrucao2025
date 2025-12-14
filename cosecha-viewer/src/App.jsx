import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title
);

/* ---------- Utils ---------- */
const safe = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
};
const sum = (arr) => (arr || []).reduce((a, b) => a + safe(b), 0);
const fmt = (n) =>
  new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n);
const kg = (n) => `${fmt(n)} kg`;
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
const rutKey = (s) => String(s || "").toLowerCase().replace(/[^0-9k]/g, "");

const dateNum = (iso) => {
  if (!iso) return NaN;
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return NaN;
  return y * 10000 + m * 100 + d;
};

function percentile(values, p) {
  const arr = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (arr.length === 0) return NaN;
  const idx = Math.max(0, Math.min(arr.length - 1, Math.floor((arr.length - 1) * p)));
  return arr[idx];
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function randomId(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function WorkerDetail({ w, anomalyDaySet }) {
  const entries = Object.entries(w.pesajes || {});
  return (
    <div className="card" style={{ marginTop: 10, background: "#fbfdff" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="subtitle">RUT</div>
          <div style={{ fontWeight: 900 }}>{w.rut}</div>
        </div>
        <div>
          <div className="subtitle">Nombre</div>
          <div style={{ fontWeight: 900 }}>{w.nombre}</div>
        </div>
        <div>
          <div className="subtitle">Días (rango)</div>
          <div style={{ fontWeight: 900 }}>{w.dias_trabajados}</div>
        </div>
        <div>
          <div className="subtitle">Total (rango)</div>
          <div style={{ fontWeight: 900 }}>{kg(w.total_pesajes)}</div>
        </div>
        <div>
          <div className="subtitle">Grupo</div>
          <div style={{ color: "#315aa6", fontWeight: 800 }}>{w.grupo || "—"}</div>
        </div>
      </div>

      <hr />

      <div className="subtitle" style={{ marginBottom: 8 }}>
        Pesajes por día (solo dentro del rango)
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pesajes</th>
              <th>Total día</th>
              <th>Alertas</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([d, arr]) => (
              <tr key={d}>
                <td style={{ whiteSpace: "nowrap" }}>{d}</td>
                <td>
                  {(arr || []).length === 0 ? (
                    <span style={{ color: "#315aa6" }}>—</span>
                  ) : (
                    arr.map((x, idx) => (
                      <span key={idx} className="badge" style={{ marginRight: 6 }}>
                        {kg(x)}
                      </span>
                    ))
                  )}
                </td>
                <td style={{ fontWeight: 900 }}>{kg(sum(arr))}</td>
                <td>
                  {anomalyDaySet?.has(d) ? <span className="badge warn">Revisar</span> : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Filter strip (top & bottom) ---------- */
function FilterStrip({
  q,
  setQ,
  showSuggest,
  setShowSuggest,
  suggestions,
  applySuggestion,
  group,
  setGroup,
  groups,
  dateFrom,
  dateTo,
  setDateFromSafe,
  setDateToSafe,
  minDate,
  maxDate,
  onClear,
  onExport,
  rightInfo,
}) {
  const suggestRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!suggestRef.current) return;
      if (!suggestRef.current.contains(e.target)) setShowSuggest(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [setShowSuggest]);

  return (
    <>
      <div className="row">
        <div className="autocomplete" ref={suggestRef}>
          <input
            className="input"
            placeholder="Buscar por Nombre o RUT (sin puntos funciona)"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            autoComplete="off"
          />

          {showSuggest && suggestions.length > 0 && (
            <div className="suggest">
              {suggestions.map((w) => (
                <div
                  key={w.rut}
                  className="suggest-item"
                  onClick={() => applySuggestion(w)}
                >
                  <div className="suggest-main">
                    <div className="suggest-name">{w.nombre}</div>
                    <div className="suggest-sub">{w.rut} • {w.grupo || "—"}</div>
                  </div>
                  <div className="suggest-sub" style={{ whiteSpace: "nowrap" }}>
                    {kg(w.total_pesajes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <select className="select" value={group} onChange={(e) => setGroup(e.target.value)}>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === "ALL" ? "Todos los grupos" : g}
            </option>
          ))}
        </select>

        <div className="row" style={{ gap: 8 }}>
          <div className="subtitle" style={{ fontWeight: 800 }}>Desde</div>
          <input
            className="input"
            style={{ minWidth: 160 }}
            type="date"
            value={dateFrom}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => setDateFromSafe(e.target.value)}
          />
        </div>

        <div className="row" style={{ gap: 8 }}>
          <div className="subtitle" style={{ fontWeight: 800 }}>Hasta</div>
          <input
            className="input"
            style={{ minWidth: 160 }}
            type="date"
            value={dateTo}
            min={minDate || undefined}
            max={maxDate || undefined}
            onChange={(e) => setDateToSafe(e.target.value)}
          />
        </div>

        <button className="btn secondary" onClick={onClear}>Limpiar</button>
<button className="btn export" onClick={onExport}>Exportar JSON</button>

        {rightInfo}
      </div>
    </>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [loadError, setLoadError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // sorting
  const [sortKey, setSortKey] = useState("nombre"); // rut | nombre | dias | total
  const [sortDir, setSortDir] = useState("asc");

  // detail
  const [openRut, setOpenRut] = useState(null);

  // pagination
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [jump, setJump] = useState(1);
  const topRef = useRef(null);

  // bottom top selector
  const [bottomTopGroup, setBottomTopGroup] = useState("AUTO");

  // autocomplete
  const [showSuggest, setShowSuggest] = useState(false);

  // ---------- Load ----------
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoadError("");
        const url = `${import.meta.env.BASE_URL}data/data.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} cargando ${url}`);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error("El JSON debe ser un array.");
        if (!cancelled) setData(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setData([]);
          setLoadError(String(e?.message || e));
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  // ---------- All harvest dates ----------
  const allDates = useMemo(() => {
    const set = new Set();
    for (const w of data) {
      const pes = w?.pesajes || {};
      for (const d of Object.keys(pes)) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const minDate = allDates[0] || "";
  const maxDate = allDates[allDates.length - 1] || "";

  // snap helpers
  const nearestAvailableDate = (iso) => {
    if (!iso) return "";
    if (!allDates.length) return iso;
    if (allDates.includes(iso)) return iso;

    const target = dateNum(iso);
    if (!Number.isFinite(target)) return allDates[0];

    let best = allDates[0];
    let bestDiff = Math.abs(dateNum(best) - target);
    for (const d of allDates) {
      const diff = Math.abs(dateNum(d) - target);
      if (diff < bestDiff) {
        best = d;
        bestDiff = diff;
      }
    }
    return best;
  };

  const clampToMinMax = (iso) => {
    if (!iso) return iso;
    if (minDate && iso < minDate) return minDate;
    if (maxDate && iso > maxDate) return maxDate;
    return iso;
  };

  // Safe setters: inside min/max, snap to harvest day, enforce min 1 day
  const setDateFromSafe = (raw) => {
    let d = nearestAvailableDate(clampToMinMax(raw));
    if (dateTo && dateNum(d) > dateNum(dateTo)) {
      setDateFrom(d);
      setDateTo(d);
      return;
    }
    setDateFrom(d);
  };

  const setDateToSafe = (raw) => {
    let d = nearestAvailableDate(clampToMinMax(raw));
    if (dateFrom && dateNum(d) < dateNum(dateFrom)) {
      setDateTo(d);
      setDateFrom(d);
      return;
    }
    setDateTo(d);
  };

  // init dates
  useEffect(() => {
    if (!minDate || !maxDate) return;
    setDateFrom((prev) => prev || minDate);
    setDateTo((prev) => prev || maxDate);
  }, [minDate, maxDate]);

  // ---------- Groups ----------
  const groups = useMemo(() => {
    const set = new Set();
    for (const w of data) if (w?.grupo) set.add(w.grupo);
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  // ---------- URL: read once when we have min/max (so we can validate) ----------
  useEffect(() => {
    if (!minDate || !maxDate) return;

    const params = new URLSearchParams(window.location.search);
    const q0 = params.get("q") ?? "";
    const g0 = params.get("g") ?? "ALL";
    const from0 = params.get("from") ?? minDate;
    const to0 = params.get("to") ?? maxDate;
    const sk0 = params.get("sort") ?? "nombre";
    const sd0 = params.get("dir") ?? "asc";
    const ps0 = Number(params.get("ps") ?? "25");
    const p0 = Number(params.get("p") ?? "0");

    setQ(q0);
    setGroup(groups.includes(g0) ? g0 : "ALL");
    setDateFromSafe(from0);
    setDateToSafe(to0);
    setSortKey(["rut","nombre","dias","total"].includes(sk0) ? sk0 : "nombre");
    setSortDir(sd0 === "desc" ? "desc" : "asc");
    setPageSize([25,50,100].includes(ps0) ? ps0 : 25);
    setPage(Number.isFinite(p0) && p0 >= 0 ? p0 : 0);
    setJump(Number.isFinite(p0) ? (p0 + 1) : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDate, maxDate]);

  // ---------- Rebuild per worker within date range ----------
  const dateFilteredWorkers = useMemo(() => {
    const fromN = dateNum(dateFrom || minDate);
    const toN = dateNum(dateTo || maxDate);

    return data.map((w) => {
      const pes = w?.pesajes || {};
      const pesInRange = {};
      let total = 0;
      let days = 0;

      for (const d of Object.keys(pes)) {
        const dn = dateNum(d);
        if (!Number.isFinite(dn)) continue;
        if (dn < fromN || dn > toN) continue;

        const arr = Array.isArray(pes[d]) ? pes[d] : [];
        pesInRange[d] = arr;
        const dayTotal = sum(arr);
        if (dayTotal > 0) days += 1;
        total += dayTotal;
      }

      return {
        ...w,
        pesajes: pesInRange,
        dias_trabajados: days,
        total_pesajes: total,
      };
    });
  }, [data, dateFrom, dateTo, minDate, maxDate]);

  // ---------- Anomaly thresholds (computed from range data) ----------
  const anomalyRules = useMemo(() => {
    // gather all individual pesajes in range
    const allPesajes = [];
    for (const w of dateFilteredWorkers) {
      const pes = w?.pesajes || {};
      for (const d of Object.keys(pes)) {
        const arr = pes[d] || [];
        for (const x of arr) allPesajes.push(safe(x));
      }
    }
    const p99 = percentile(allPesajes, 0.99);
    // fallback if too few data
    const highCut = Number.isFinite(p99) ? Math.max(1, p99 * 1.5) : 200; // heurístico
    const maxCountPerDay = 20; // muchos “/” en el día -> revisar
    return { highCut, maxCountPerDay };
  }, [dateFilteredWorkers]);

  // anomalies per worker: { has, daySet }
  const anomaliesByRut = useMemo(() => {
    const map = new Map();
    for (const w of dateFilteredWorkers) {
      const daySet = new Set();
      let has = false;

      const pes = w?.pesajes || {};
      for (const d of Object.keys(pes)) {
        const arr = Array.isArray(pes[d]) ? pes[d] : [];
        const badLow = arr.some((x) => safe(x) <= 0);
        const badHigh = arr.some((x) => safe(x) > anomalyRules.highCut);
        const tooMany = arr.length > anomalyRules.maxCountPerDay;
        if (badLow || badHigh || tooMany) {
          has = true;
          daySet.add(d);
        }
      }
      map.set(w.rut, { has, daySet });
    }
    return map;
  }, [dateFilteredWorkers, anomalyRules]);

  // ---------- Filtered (IMPORTANT: hide 0kg) ----------
  const filtered = useMemo(() => {
    const nq = norm(q).trim();
    const nk = rutKey(q).trim();

    return dateFilteredWorkers
      .filter((w) => safe(w.total_pesajes) > 0) // NO mostrar 0kg
      .filter((w) => {
        if (group !== "ALL" && w.grupo !== group) return false;
        if (!nq && !nk) return true;

        const byName = norm(w.nombre).includes(nq);
        const byRut = nk ? rutKey(w.rut).includes(nk) : false;
        return byName || byRut;
      });
  }, [dateFilteredWorkers, q, group]);

  // reset page on filter changes
  useEffect(() => {
    setPage(0);
    setJump(1);
    setOpenRut(null);
  }, [q, group, dateFrom, dateTo, pageSize]);

  // ---------- Sorting ----------
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortKey === "nombre")
        return dir * String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
      if (sortKey === "rut")
        return dir * rutKey(a.rut).localeCompare(rutKey(b.rut));
      if (sortKey === "dias")
        return dir * (safe(a.dias_trabajados) - safe(b.dias_trabajados));
      if (sortKey === "total")
        return dir * (safe(a.total_pesajes) - safe(b.total_pesajes));
      return 0;
    });

    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "dias" || key === "total" ? "desc" : "asc");
    }
  }

  // ---------- Pagination ----------
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, pageCount - 1);
  const startIdx = pageSafe * pageSize;
  const pageItems = sorted.slice(startIdx, startIdx + pageSize);

  function goPage(p) {
    const next = Math.max(0, Math.min(p, pageCount - 1));
    setPage(next);
    setJump(next + 1);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function applyJump() {
    const n = Number(jump);
    if (!Number.isFinite(n)) return;
    goPage(n - 1);
  }

  // ---------- Suggestions (autocomplete) ----------
  const suggestions = useMemo(() => {
    const nq = norm(q).trim();
    const nk = rutKey(q).trim();
    if (!nq && !nk) return [];

    const scored = dateFilteredWorkers
      .filter((w) => safe(w.total_pesajes) > 0)
      .map((w) => {
        const name = norm(w.nombre);
        const rut = rutKey(w.rut);
        let score = 0;

        if (nq) {
          if (name.startsWith(nq)) score += 50;
          else if (name.includes(nq)) score += 30;
        }
        if (nk) {
          if (rut.startsWith(nk)) score += 80;
          else if (rut.includes(nk)) score += 40;
        }
        if (group !== "ALL" && w.grupo === group) score += 5;

        return { w, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.w);

    return scored;
  }, [q, group, dateFilteredWorkers]);

  function applySuggestion(w) {
    setQ(w.rut);
    if (w.grupo) setGroup(w.grupo);
    setOpenRut(w.rut);
    setShowSuggest(false);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

function exportJSON() {
  // Export ANONIMIZADO: sin RUT, sin detalle, solo totales
  const payload = sorted.map((w) => ({
    id: randomId(8),                 // ← ID anónimo
    nombre: w.nombre,
    grupo: w.grupo || "",
    dias_trabajados: w.dias_trabajados,
    total_kilos: Number(w.total_pesajes.toFixed(2)),
  }));

  const gLabel = group === "ALL" ? "ALL" : group;
  const filename = `resumen_cosecha_${gLabel}_${dateFrom}_${dateTo}.json`;

  const text = JSON.stringify(payload, null, 2);
  downloadText(filename, text);
}


  // ---------- Chips summary ----------
  const chips = useMemo(() => {
    const list = [];
    if (group !== "ALL") list.push({ k: "g", label: `Grupo: ${group}`, clear: () => setGroup("ALL") });
    if (dateFrom && dateTo) list.push({ k: "d", label: `Fechas: ${dateFrom} → ${dateTo}`, clear: () => { setDateFromSafe(minDate); setDateToSafe(maxDate); }});
    if (q.trim()) list.push({ k: "q", label: `Buscar: "${q.trim()}"`, clear: () => setQ("") });
    list.push({ k: "s", label: `Orden: ${sortKey}/${sortDir}`, clear: () => { setSortKey("nombre"); setSortDir("asc"); }});
    list.push({ k: "p", label: `Página: ${pageSafe + 1}/${pageCount} • ${pageSize}/pág`, clear: () => { setPage(0); setJump(1); }});
    return list;
  }, [group, dateFrom, dateTo, q, sortKey, sortDir, pageSafe, pageCount, pageSize, minDate, maxDate]);

  // ---------- URL sync (replaceState) ----------
  useEffect(() => {
    if (!minDate || !maxDate) return;

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (group !== "ALL") params.set("g", group);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    params.set("sort", sortKey);
    params.set("dir", sortDir);
    params.set("ps", String(pageSize));
    params.set("p", String(pageSafe));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [q, group, dateFrom, dateTo, sortKey, sortDir, pageSize, pageSafe, minDate, maxDate]);

  // ---------- Charts ----------
  const pieByGroup = useMemo(() => {
    const map = new Map();
    for (const w of dateFilteredWorkers) {
      if (safe(w.total_pesajes) <= 0) continue;
      const g = w.grupo || "Sin grupo";
      map.set(g, (map.get(g) || 0) + safe(w.total_pesajes));
    }
    const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return rows.map(([name, value]) => ({ name, value }));
  }, [dateFilteredWorkers]);

  const dayTotalsForActiveGroup = useMemo(() => {
    const map = new Map();
    const pool =
      group === "ALL"
        ? dateFilteredWorkers
        : dateFilteredWorkers.filter((w) => w.grupo === group);

    for (const w of pool) {
      if (safe(w.total_pesajes) <= 0) continue;
      const pes = w?.pesajes || {};
      for (const d of Object.keys(pes)) {
        map.set(d, (map.get(d) || 0) + sum(pes[d]));
      }
    }

    return Array.from(map.entries())
      .map(([date, kilos]) => ({ date, kilos }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dateFilteredWorkers, group]);

  const pieColors = [
    "#1d4ed8","#2563eb","#3b82f6","#60a5fa",
    "#0ea5e9","#10b981","#f59e0b","#ef4444",
  ];

  const pieData = useMemo(() => ({
    labels: pieByGroup.map((x) => x.name),
    datasets: [{
      data: pieByGroup.map((x) => x.value),
      backgroundColor: pieByGroup.map((_, i) => pieColors[i % pieColors.length]),
      borderWidth: 1,
    }],
  }), [pieByGroup]);

  const lineData = useMemo(() => ({
    labels: dayTotalsForActiveGroup.map((x) => x.date),
    datasets: [{
      label: "Kilos por día",
      data: dayTotalsForActiveGroup.map((x) => x.kilos),
      borderWidth: 2,
      tension: 0.3,
      fill: true,
    }],
  }), [dayTotalsForActiveGroup]);

  const barData = useMemo(() => ({
    labels: dayTotalsForActiveGroup.map((x) => x.date),
    datasets: [{
      label: "Kilos por día",
      data: dayTotalsForActiveGroup.map((x) => x.kilos),
      borderWidth: 1,
    }],
  }), [dayTotalsForActiveGroup]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${kg(ctx.parsed?.y ?? ctx.parsed)}`,
        },
      },
    },
    scales: { y: { ticks: { callback: (v) => `${v} kg` } } },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${kg(ctx.parsed)}` } },
    },
  };

  // ---------- Top 10 ----------
  const top10General = useMemo(() => {
    return [...dateFilteredWorkers]
      .filter((w) => safe(w.total_pesajes) > 0)
      .sort((a, b) => safe(b.total_pesajes) - safe(a.total_pesajes))
      .slice(0, 10);
  }, [dateFilteredWorkers]);

  const selectedGroupForTop = useMemo(() => {
    if (bottomTopGroup !== "AUTO") return bottomTopGroup;
    if (group !== "ALL") return group;
    return groups.find((g) => g !== "ALL") || "ALL";
  }, [bottomTopGroup, group, groups]);

  const top10ByGroup = useMemo(() => {
    if (!selectedGroupForTop || selectedGroupForTop === "ALL") return [];
    return dateFilteredWorkers
      .filter((w) => w.grupo === selectedGroupForTop)
      .filter((w) => safe(w.total_pesajes) > 0)
      .sort((a, b) => safe(b.total_pesajes) - safe(a.total_pesajes))
      .slice(0, 10);
  }, [dateFilteredWorkers, selectedGroupForTop]);

  const onClear = () => {
    setQ("");
    setGroup("ALL");
    if (minDate) setDateFromSafe(minDate);
    if (maxDate) setDateToSafe(maxDate);
  };

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="header-inner">
          <div className="brand">
            <img className="logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" />
            <div>
              <div className="title">Cosecha Arándanos · Trucao 2025</div>
              <div className="subtitle">Totales en kg · 0 kg no se muestran</div>
            </div>
          </div>
          <a className="profile-link" href="https://www.instagram.com/is_serviciosagricola/" target="_blank" rel="noreferrer">
             Agrofrutos SPA
          </a>
        </div>
      </div>

      <div className="container">
        {loadError && (
          <div className="card" style={{ borderColor: "#ef4444" }}>
            <strong style={{ color: "#ef4444" }}>Error cargando data.json</strong>
            <div className="subtitle">{loadError}</div>
          </div>
        )}

        {/* TOP FILTERS + CHIPS */}
        <div className="card">
          <FilterStrip
            q={q}
            setQ={setQ}
            showSuggest={showSuggest}
            setShowSuggest={setShowSuggest}
            suggestions={suggestions}
            applySuggestion={applySuggestion}
            group={group}
            setGroup={setGroup}
            groups={groups}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFromSafe={setDateFromSafe}
            setDateToSafe={setDateToSafe}
            minDate={minDate}
            maxDate={maxDate}
            onClear={onClear}
            onExport={exportJSON}
            rightInfo={
              <span className="subtitle" style={{ fontWeight: 900 }}>
                {sorted.length} trabajadores (rango)
              </span>
            }
          />

          <div className="chips">
            {chips.map((c) => (
              <span key={c.k} className="chip">
                {c.label}
                <span className="x" onClick={c.clear}>x</span>
              </span>
            ))}
          </div>

          <div className="subtitle" style={{ marginTop: 8 }}>
            Fechas permitidas: <strong>{minDate || "—"}</strong> a <strong>{maxDate || "—"}</strong> ·
            si pones una fecha sin cosecha o rango imposible, se ajusta automáticamente (mínimo 1 día).
          </div>
        </div>

        {/* LIST TOP REF */}
        <div ref={topRef} />

        {/* PAGINATION */}
        <div className="card">
          <div className="pager">
            <button className="btn secondary" onClick={() => goPage(0)} disabled={pageSafe <= 0}>⏮ Primera</button>
            <button className="btn secondary" onClick={() => goPage(pageSafe - 1)} disabled={pageSafe <= 0}>◀ Anterior</button>

            <span className="mini">
              Página <strong>{pageSafe + 1}</strong> / <strong>{pageCount}</strong>
            </span>

            <button className="btn secondary" onClick={() => goPage(pageSafe + 1)} disabled={pageSafe >= pageCount - 1}>Siguiente ▶</button>
            <button className="btn secondary" onClick={() => goPage(pageCount - 1)} disabled={pageSafe >= pageCount - 1}>Última ⏭</button>

            <span className="mini">Mostrar</span>
            <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="mini">por página</span>

            <span className="mini">Ir a</span>
            <input className="input" type="number" min={1} max={pageCount} value={jump} onChange={(e) => setJump(e.target.value)} />
            <button className="btn secondary" onClick={applyJump}>Ir</button>
          </div>
        </div>

        {/* TABLE (desktop) */}
        <div className="card table-desktop">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("rut")}>RUT</th>
                  <th onClick={() => toggleSort("nombre")}>Nombre</th>
                  <th onClick={() => toggleSort("dias")}>Días</th>
                  <th onClick={() => toggleSort("total")}>Total <span className="unit">kg</span></th>
                  <th>Grupo</th>
                  <th>Alertas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((w) => {
                  const isOpen = openRut === w.rut;
                  const an = anomaliesByRut.get(w.rut);
                  return (
                    <React.Fragment key={w.rut}>
                      <tr>
                        <td style={{ whiteSpace: "nowrap" }}>{w.rut}</td>
                        <td style={{ fontWeight: 900 }}>{w.nombre}</td>
                        <td>{w.dias_trabajados}</td>
                        <td style={{ fontWeight: 900 }}>{kg(w.total_pesajes)}</td>
                        <td><span className="badge">{w.grupo || "—"}</span></td>
                        <td>{an?.has ? <span className="badge warn">Revisar</span> : <span className="muted">—</span>}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn secondary" onClick={() => setOpenRut(isOpen ? null : w.rut)}>
                            {isOpen ? "Ocultar" : "Detalle"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={7}>
                            <WorkerDetail w={w} anomalyDaySet={an?.daySet} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS (asumiendo que ya las tienes en tu CSS previo) */}
        <div className="cards-mobile">
          {pageItems.map((w) => {
            const isOpen = openRut === w.rut;
            const an = anomaliesByRut.get(w.rut);
            return (
              <div key={w.rut} className="worker-card">
                <div className="top">
                  <div>
                    <div className="name">{w.nombre}</div>
                    <div className="meta">{w.rut}</div>
                    <div className="meta">
                      Días: <strong>{w.dias_trabajados}</strong> · Grupo:{" "}
                      <strong>{w.grupo || "—"}</strong>
                    </div>
                    {an?.has && <div className="meta"><span className="badge warn">Revisar datos</span></div>}
                  </div>
                  <div className="right">
                    <div className="kg">{kg(w.total_pesajes)}</div>
                    <div className="meta">Total (rango)</div>
                  </div>
                </div>

                <div className="actions">
                  <button className="btn secondary" onClick={() => setOpenRut(isOpen ? null : w.rut)}>
                    {isOpen ? "Ocultar detalle" : "Ver detalle"}
                  </button>
                </div>

                {isOpen && <WorkerDetail w={w} anomalyDaySet={an?.daySet} />}
              </div>
            );
          })}
        </div>

        {/* BOTTOM: FILTERS ALSO HERE + CHARTS + TOPS */}
        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            Resumen y gráficos (mismos filtros)
          </div>

          <FilterStrip
            q={q}
            setQ={setQ}
            showSuggest={showSuggest}
            setShowSuggest={setShowSuggest}
            suggestions={suggestions}
            applySuggestion={applySuggestion}
            group={group}
            setGroup={setGroup}
            groups={groups}
            dateFrom={dateFrom}
            dateTo={dateTo}
            setDateFromSafe={setDateFromSafe}
            setDateToSafe={setDateToSafe}
            minDate={minDate}
            maxDate={maxDate}
            onClear={onClear}
            onExport={exportJSON}
            rightInfo={
              <span className="subtitle" style={{ fontWeight: 800 }}>
                Línea/Barras afectadas por grupo activo
              </span>
            }
          />

          <div className="row" style={{ marginTop: 10 }}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              <div className="subtitle" style={{ fontWeight: 900, marginBottom: 6 }}>
                Torta: kilos por grupo <span className="unit">kg</span>
              </div>
              <div className="chartBox">
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>

            <div style={{ width: "100%", maxWidth: 680 }}>
              <div className="subtitle" style={{ fontWeight: 900, marginBottom: 6 }}>
                Línea: kilos por día (grupo activo) <span className="unit">kg</span>
              </div>
              <div className="chartBox">
                <Line data={lineData} options={commonOptions} />
              </div>
              <div className="subtitle" style={{ marginTop: 6 }}>
                Grupo activo: <span className="badge">{group === "ALL" ? "Todos" : group}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="subtitle" style={{ fontWeight: 900, marginBottom: 6 }}>
              Barras: kilos por día (grupo activo) <span className="unit">kg</span>
            </div>
            <div className="chartBox">
              <Bar data={barData} options={commonOptions} />
            </div>
          </div>

          <hr />

          <div className="row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>
                Top 10 general <span className="unit">kg</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>RUT</th>
                      <th>Nombre</th>
                      <th>Grupo</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10General.map((w) => (
                      <tr key={w.rut}>
                        <td style={{ whiteSpace: "nowrap" }}>{w.rut}</td>
                        <td style={{ fontWeight: 900 }}>{w.nombre}</td>
                        <td><span className="badge">{w.grupo || "—"}</span></td>
                        <td style={{ fontWeight: 900 }}>{kg(w.total_pesajes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 280 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 900 }}>
                  Top 10 por grupo <span className="unit">kg</span>
                </div>
                <select className="select" value={bottomTopGroup} onChange={(e) => setBottomTopGroup(e.target.value)}>
                  <option value="AUTO">Auto (grupo activo / primero)</option>
                  {groups.filter((g) => g !== "ALL").map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>RUT</th>
                      <th>Nombre</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10ByGroup.map((w) => (
                      <tr key={w.rut}>
                        <td style={{ whiteSpace: "nowrap" }}>{w.rut}</td>
                        <td style={{ fontWeight: 900 }}>{w.nombre}</td>
                        <td style={{ fontWeight: 900 }}>{kg(w.total_pesajes)}</td>
                      </tr>
                    ))}
                    {top10ByGroup.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: "#315aa6" }}>
                          No hay datos para ese grupo en el rango.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="subtitle" style={{ marginTop: 8 }}>
                Grupo seleccionado: <span className="badge">{selectedGroupForTop}</span>
              </div>
            </div>
          </div>

          <div className="subtitle" style={{ marginTop: 10 }}>
            Alertas: pesaje ≤ 0, pesaje muy alto (umbral dinámico desde el P99), o demasiados pesajes en un día.
          </div>
        </div>
      </div>
    </>
  );
}
