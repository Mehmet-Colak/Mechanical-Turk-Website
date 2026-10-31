// Percentage slider for Settings → Motif art (widget: motif_size in config.yml).
(function () {
  const h = globalThis.__SVELTIA_CMS_REACT__.createElement;

  function MotifSize({ value, forID, onChange }) {
    const n = Number(value);
    const percent = value !== "" && value != null && n >= 50 && n <= 150 ? n : 100;
    return h("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "4px 0" } },
      h("input", {
        type: "range", id: forID, min: 50, max: 150, step: 5, value: percent,
        onChange: (e) => onChange(Number(e.target.value)),
        style: { flex: 1, minWidth: 0 },
      }),
      h("output", { htmlFor: forID, style: { minWidth: "4ch", textAlign: "end", fontVariantNumeric: "tabular-nums" } }, `${percent}%`));
  }

  window.CMS.registerWidget("motif_size", MotifSize);
})();
