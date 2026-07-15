const state = {
  data: null,
  metadataData: null,
  metadataCategory: "key",
  metadataVersionByCategory: {},
  backend: "A",
  caseIndex: 0,
};

const RELEASE_ID = "A.1.0";

function $(selector) {
  return document.querySelector(selector);
}

function formatLabel(value) {
  return String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatEvidenceValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.slice(0, 12).join(", ");
  if (value.value !== undefined) return formatEvidenceValue(value.value);
  if (value.pitch_sequence) return value.pitch_sequence.join("–");
  if (value.note_count !== undefined) return `${value.note_count} Notes`;
  if (value.total_note_onsets !== undefined) return `${value.total_note_onsets} Onsets · ${value.note_onsets_per_second} / Sec`;
  return JSON.stringify(value);
}

function currentCase() {
  return state.data?.cases?.[state.caseIndex] || null;
}

function currentMetadataCategory() {
  return state.metadataData?.categories?.find((category) => category.id === state.metadataCategory) || null;
}

function currentMetadataVersion() {
  const category = currentMetadataCategory();
  if (!category) return null;
  const selectedVersion = state.metadataVersionByCategory[category.id] || category.current_version;
  return category.versions.find((version) => version.id === selectedVersion) || category.versions[0] || null;
}

function renderMetadataCategories() {
  const container = $("[data-metadata-categories]");
  container.innerHTML = "";
  document.querySelectorAll("[data-metadata-shortcut]").forEach((button) => {
    const isActive = button.dataset.metadataShortcut === state.metadataCategory;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  state.metadataData.categories.forEach((category) => {
    const button = document.createElement("button");
    const isActive = category.id === state.metadataCategory;
    button.type = "button";
    button.className = `metadata-category-button${isActive ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));
    button.innerHTML = `<span>${category.label.slice(0, 1)}</span><strong>${category.label}</strong><small>${category.current_version}</small>`;
    button.addEventListener("click", () => selectMetadataCategory(category.id));
    container.appendChild(button);
  });
}

function renderMetadataVersions() {
  const category = currentMetadataCategory();
  const selectedVersion = currentMetadataVersion();
  const container = $("[data-metadata-versions]");
  container.innerHTML = "";
  category.versions.forEach((version) => {
    const button = document.createElement("button");
    const isActive = version.id === selectedVersion.id;
    button.type = "button";
    button.className = `metadata-version-button${isActive ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));
    button.innerHTML = `<strong>${version.id}</strong><span>${version.status}</span>${version.id === category.current_version ? "<em>Current</em>" : ""}`;
    button.addEventListener("click", () => {
      state.metadataVersionByCategory[category.id] = version.id;
      renderMetadataExplorer();
    });
    container.appendChild(button);
  });
}

function renderMetadataDiagram(version) {
  const container = $("[data-metadata-diagram]");
  container.innerHTML = "";
  version.diagram.forEach((step, index) => {
    const node = document.createElement("article");
    node.className = "metadata-diagram-node";
    node.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${step.title}</strong><small>${step.detail}</small>`;
    container.appendChild(node);
    if (index < version.diagram.length - 1) {
      const arrow = document.createElement("i");
      arrow.className = "metadata-diagram-arrow";
      arrow.setAttribute("aria-hidden", "true");
      container.appendChild(arrow);
    }
  });
}

function renderMetadataDetail() {
  const category = currentMetadataCategory();
  const version = currentMetadataVersion();
  const status = $("[data-metadata-status]");
  $("[data-metadata-kicker]").textContent = `${version.id} · ${category.label} · ${version.date}`;
  $("[data-metadata-title]").textContent = version.title;
  $("[data-metadata-summary]").textContent = version.summary;
  status.textContent = version.status;
  status.className = `status-pill ${version.status_tone}`;
  $("[data-metadata-stage]").textContent = version.stage;
  $("[data-metadata-scope]").textContent = version.scope;
  $("[data-metadata-gate]").textContent = version.next_gate;

  const characteristics = $("[data-metadata-characteristics]");
  characteristics.innerHTML = "";
  version.characteristics.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    characteristics.appendChild(item);
  });

  renderMetadataDiagram(version);
  $("[data-metadata-prompt-label]").textContent = version.prompt_label;
  $("[data-metadata-prompt-note]").textContent = version.prompt_note;
  $("[data-metadata-prompt]").textContent = state.metadataData.prompts[version.prompt_ref];
  $("[data-metadata-example-label]").textContent = version.example_label;
  $("[data-metadata-example-note]").textContent = version.example_note;
  $("[data-metadata-example]").textContent = JSON.stringify(version.example_metadata, null, 2);
}

function renderMetadataExplorer() {
  if (!state.metadataData) return;
  renderMetadataCategories();
  renderMetadataVersions();
  renderMetadataDetail();
}

function selectMetadataCategory(categoryId, shouldScroll = false) {
  state.metadataCategory = categoryId;
  const category = currentMetadataCategory();
  if (!state.metadataVersionByCategory[category.id]) {
    state.metadataVersionByCategory[category.id] = category.current_version;
  }
  renderMetadataExplorer();
  if (shouldScroll) {
    $("#metadata-development").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderMetrics() {
  const runs = state.data.summary.executed_jobs;
  $("[data-metric='web-runs']").textContent = runs;
  $("[data-release-runs]").textContent = runs;
}

function renderCasePicker() {
  const picker = $("[data-case-picker]");
  picker.innerHTML = "";
  state.data.cases.forEach((caseItem, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `case-button${index === state.caseIndex ? " active" : ""}`;
    button.textContent = `IDX ${String(index).padStart(2, "0")} · ${caseItem.family_label}`;
    button.addEventListener("click", () => {
      state.caseIndex = index;
      renderCasePicker();
      renderCase();
    });
    picker.appendChild(button);
  });
}

function renderBackend() {
  document.querySelectorAll("[data-backend]").forEach((button) => {
    button.classList.toggle("active", button.dataset.backend === state.backend);
  });
  const isWeb = state.backend === "A";
  $("[data-case-picker]").hidden = !isWeb;
  $("[data-case-content]").hidden = !isWeb;
  $("[data-empty-backend]").hidden = isWeb;
  if (isWeb) {
    renderCasePicker();
    renderCase();
  }
}

function originText(caseItem) {
  const window = caseItem.window || {};
  const segment = window.start_bar
    ? `bars ${window.start_bar}–${Math.max(window.start_bar, (window.end_bar_exclusive || window.start_bar + 1) - 1)}`
    : "a controlled evidence window";
  const provenance = caseItem.source_kind === "Actual Train Split"
    ? `${caseItem.source_id.toUpperCase()}, ${segment}`
    : `${caseItem.source_kind}, ${segment}`;
  return `${provenance}; rule-extracted general metadata rendered by ${caseItem.provenance.model} through the Gemini Web subscription track.`;
}

function renderCase() {
  const caseItem = currentCase();
  if (!caseItem) return;
  $("[data-case-release]").textContent = `${RELEASE_ID} · ${caseItem.family_label}`;
  $("[data-case-name]").textContent = caseItem.title;
  $("[data-case-origin]").textContent = originText(caseItem);
  $("[data-case-source]").textContent = caseItem.source_id;
  $("[data-case-split]").textContent = formatLabel(caseItem.split);
  $("[data-caption-short]").textContent = caseItem.response.caption_short;
  $("[data-caption-detailed]").textContent = caseItem.response.caption_detailed;
  $("[data-latency]").textContent = `${caseItem.provenance.elapsed_sec.toFixed(2)} Sec`;
  $("[data-researcher-note]").textContent = caseItem.researcher_audit;
  renderEvidence(caseItem);
  renderMedia(caseItem);
}

function renderEvidence(caseItem) {
  const list = $("[data-evidence-list]");
  list.innerHTML = "";
  Object.entries(caseItem.supported_evidence || {}).slice(0, 7).forEach(([key, value]) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const definition = document.createElement("dd");
    term.textContent = formatLabel(key);
    definition.textContent = formatEvidenceValue(value);
    row.append(term, definition);
    list.appendChild(row);
  });

  const uncertain = $("[data-uncertain-list]");
  uncertain.innerHTML = "";
  const blocked = caseItem.blocked_evidence || [];
  const values = blocked.length ? blocked : ["No Blocked Attributes"];
  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = `uncertain-chip${blocked.length ? "" : " clean"}`;
    chip.textContent = formatLabel(value.replace(":", " · "));
    uncertain.appendChild(chip);
  });
}

function renderMedia(caseItem) {
  const media = caseItem.media || {};
  const notes = media.notes || [];
  const hasMedia = Boolean(media.audio || media.midi);
  const canvas = $("[data-piano-roll]");
  const empty = $("[data-roll-empty]");
  const audio = $("[data-audio]");
  const midiLink = $("[data-midi-link]");
  const status = $("[data-media-status]");

  empty.hidden = notes.length > 0;
  canvas.hidden = notes.length === 0;
  status.textContent = hasMedia ? "Actual Train Segment" : "Evidence Only";
  status.className = `status-pill${hasMedia ? " complete" : ""}`;
  $("[data-media-title]").textContent = hasMedia ? "Piano Roll And VST Render" : "Evidence-Only Case";

  if (media.audio) {
    audio.src = media.audio;
  } else {
    audio.removeAttribute("src");
    audio.load();
  }

  if (media.midi) {
    midiLink.href = media.midi;
    midiLink.hidden = false;
  } else {
    midiLink.hidden = true;
  }

  $("[data-media-note]").textContent = hasMedia
    ? "POP909 Train bars 10–13. The WAV is a deterministic VST-style render of the cropped MIDI, not original dataset audio."
    : "This recorded pilot used controlled MIDI-derived metadata without a retained media attachment.";

  if (notes.length) requestAnimationFrame(() => drawPianoRoll(canvas, notes, media.duration_sec || 1));
}

function drawPianoRoll(canvas, notes, duration) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  const context = canvas.getContext("2d");
  context.scale(scale, scale);

  const width = rect.width;
  const height = rect.height;
  const margin = { top: 25, right: 18, bottom: 31, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const pitches = notes.map((note) => note.pitch);
  const minPitch = Math.min(...pitches) - 2;
  const maxPitch = Math.max(...pitches) + 2;
  const pitchRange = Math.max(12, maxPitch - minPitch + 1);
  const x = (seconds) => margin.left + (seconds / duration) * plotWidth;
  const y = (pitch) => margin.top + plotHeight - ((pitch - minPitch) / pitchRange) * plotHeight;
  const noteHeight = Math.max(5, Math.min(10, plotHeight / pitchRange * 0.72));

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#d8d2c8";
  context.lineWidth = 1;
  context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);

  const tickStep = duration > 8 ? 2 : 1;
  context.font = '10px "Public Sans", sans-serif';
  context.fillStyle = "#706d66";
  context.textAlign = "center";
  for (let time = 0; time <= duration + 0.001; time += tickStep) {
    const xx = x(time);
    context.strokeStyle = "rgba(216, 210, 200, 0.65)";
    context.beginPath();
    context.moveTo(xx, margin.top);
    context.lineTo(xx, margin.top + plotHeight);
    context.stroke();
    context.fillText(`${time.toFixed(0)}s`, xx, height - 10);
  }

  for (let pitch = Math.ceil(minPitch / 12) * 12; pitch <= maxPitch; pitch += 12) {
    const yy = y(pitch);
    context.strokeStyle = "rgba(216, 210, 200, 0.45)";
    context.beginPath();
    context.moveTo(margin.left, yy);
    context.lineTo(margin.left + plotWidth, yy);
    context.stroke();
    context.textAlign = "right";
    context.fillStyle = "#706d66";
    context.fillText(midiName(pitch), margin.left - 7, yy + 3);
  }

  notes.forEach((note) => {
    const xx = x(note.start_sec);
    const yy = y(note.pitch) - noteHeight / 2;
    const noteWidth = Math.max(2.5, x(note.start_sec + note.duration_sec) - xx);
    const fill = note.role === "melody" ? "#3769a8" : note.role === "left_hand" ? "#b8b2a8" : "#c79536";
    context.fillStyle = fill;
    context.strokeStyle = note.role === "melody" ? "#244a78" : note.role === "left_hand" ? "#777169" : "#8c6723";
    context.lineWidth = 0.85;
    context.beginPath();
    if (context.roundRect) context.roundRect(xx, yy, noteWidth, noteHeight, 2);
    else context.rect(xx, yy, noteWidth, noteHeight);
    context.fill();
    context.stroke();
  });
}

function midiName(pitch) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

function modalPayload(kind, caseItem) {
  if (kind === "prompt") return { kicker: `${RELEASE_ID} · Exact Request`, title: "Captioning Prompt", content: caseItem.prompt };
  if (kind === "evidence") return { kicker: `${RELEASE_ID} · Required Input`, title: "General Metadata", content: JSON.stringify({ supported_evidence: caseItem.supported_evidence, uncertain_or_unknown_evidence: caseItem.blocked_evidence }, null, 2) };
  return { kicker: `${RELEASE_ID} · Recorded Artifact`, title: "Raw Result JSON", content: JSON.stringify({ response: caseItem.response, provenance: caseItem.provenance, validation: caseItem.validation, artifact_paths: caseItem.artifact_paths }, null, 2) };
}

function openDialog(kind) {
  const caseItem = currentCase();
  const payload = modalPayload(kind, caseItem);
  $("[data-dialog-kicker]").textContent = payload.kicker;
  $("[data-dialog-title]").textContent = payload.title;
  $("[data-dialog-content]").textContent = payload.content;
  $("[data-detail-dialog]").showModal();
}

function renderCaveats() {
  const list = $("[data-caveat-list]");
  list.innerHTML = "";
  state.data.caveats.slice(0, 4).forEach((caveat) => {
    const item = document.createElement("li");
    item.textContent = caveat;
    list.appendChild(item);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-metadata-shortcut]").forEach((button) => {
    button.addEventListener("click", () => selectMetadataCategory(button.dataset.metadataShortcut, true));
  });
  document.querySelectorAll("[data-backend]").forEach((button) => {
    button.addEventListener("click", () => {
      state.backend = button.dataset.backend;
      renderBackend();
    });
  });
  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => openDialog(button.dataset.openModal));
  });
  $("[data-dialog-close]").addEventListener("click", () => $("[data-detail-dialog]").close());
  $("[data-detail-dialog]").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  window.addEventListener("resize", () => {
    const caseItem = currentCase();
    if (state.backend === "A" && caseItem?.media?.notes?.length) drawPianoRoll($("[data-piano-roll]"), caseItem.media.notes, caseItem.media.duration_sec || 1);
  });
}

async function initialize() {
  try {
    const [summaryResponse, metadataResponse] = await Promise.all([
      fetch("assets/data/summary.json", { cache: "no-store" }),
      fetch("assets/data/metadata_versions.json", { cache: "no-store" }),
    ]);
    if (!summaryResponse.ok) throw new Error(`Summary HTTP ${summaryResponse.status}`);
    if (!metadataResponse.ok) throw new Error(`Metadata HTTP ${metadataResponse.status}`);
    state.data = await summaryResponse.json();
    state.metadataData = await metadataResponse.json();
    renderMetrics();
    renderCaveats();
    bindEvents();
    renderMetadataExplorer();
    renderBackend();
  } catch (error) {
    document.body.innerHTML = `<main class="shell page-shell"><section class="caveat-panel"><div><p class="section-kicker">Load Error</p><h2>Experiment Data Unavailable</h2></div><p>${error.message}</p></section></main>`;
  }
}

initialize();
