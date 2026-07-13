const state = {
  data: null,
  taskId: null,
  caseId: null,
  openMenu: null,
};

const promptOrder = ["base_M", "base_D", "base_MD"];

function $(selector) {
  return document.querySelector(selector);
}

function el(tagName, className, textContent) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textContent !== undefined) element.textContent = textContent;
  return element;
}

function formatRole(role) {
  return String(role || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function currentCases() {
  return state.data.cases.filter((item) => item.task_id === state.taskId);
}

function currentCase() {
  return state.data.cases.find((item) => item.case_id === state.caseId) || state.data.cases[0];
}

function setTask(taskId, preferredCaseId = null) {
  state.taskId = taskId;
  const cases = currentCases();
  state.caseId = preferredCaseId && cases.some((item) => item.case_id === preferredCaseId)
    ? preferredCaseId
    : cases[0]?.case_id;
  renderAll();
}

function setCase(caseId) {
  state.caseId = caseId;
  renderAll();
}

function renderTaskTabs() {
  const container = $("[data-task-tabs]");
  container.innerHTML = "";
  state.data.tasks.forEach((task) => {
    const button = el("button", `task-tab${task.task_id === state.taskId ? " active" : ""}`, `${task.label} (${task.case_count})`);
    button.type = "button";
    button.addEventListener("click", () => setTask(task.task_id));
    container.appendChild(button);
  });
}

function closeMetricMenus() {
  state.openMenu = null;
  document.querySelectorAll("[data-metric-menu]").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll("[data-metric-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function toggleMetricMenu(menuId) {
  if (state.openMenu === menuId) {
    closeMetricMenus();
    return;
  }
  state.openMenu = menuId;
  document.querySelectorAll("[data-metric-menu]").forEach((menu) => {
    menu.hidden = menu.dataset.metricMenu !== menuId;
  });
  document.querySelectorAll("[data-metric-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", String(button.dataset.metricToggle === menuId));
  });
}

function renderHeroMenus() {
  const currentTask = state.data.tasks.find((task) => task.task_id === state.taskId);
  const caseItem = currentCase();
  const caseIndexWithinTask = currentCases().findIndex((item) => item.case_id === state.caseId);
  $("[data-summary='tasks']").textContent = currentTask?.label || "—";
  $("[data-summary-detail='tasks']").textContent = `${state.data.tasks.length} Task Families Available`;
  $("[data-summary='cases']").textContent = `Idx ${String(Math.max(0, caseIndexWithinTask)).padStart(2, "0")}`;
  $("[data-summary-detail='cases']").textContent = `${currentCases().length} Sample Idx Option${currentCases().length === 1 ? "" : "s"}`;

  const taskMenu = $("[data-metric-menu='tasks']");
  taskMenu.innerHTML = "";
  state.data.tasks.forEach((task) => {
    const button = el("button", `metric-option${task.task_id === state.taskId ? " active" : ""}`);
    button.type = "button";
    button.innerHTML = `<span>${task.label}</span><small>${task.case_count} Case${task.case_count === 1 ? "" : "s"} · ${task.description}</small>`;
    button.addEventListener("click", () => {
      setTask(task.task_id);
      closeMetricMenus();
    });
    taskMenu.appendChild(button);
  });

  const caseMenu = $("[data-metric-menu='cases']");
  caseMenu.innerHTML = "";
  currentCases().forEach((candidate, candidateIndex) => {
    const button = el("button", `metric-option${candidate.case_id === state.caseId ? " active" : ""}`);
    button.type = "button";
    button.innerHTML = `<span>Idx ${String(candidateIndex).padStart(2, "0")}</span>`;
    button.addEventListener("click", () => {
      setCase(candidate.case_id);
      closeMetricMenus();
    });
    caseMenu.appendChild(button);
  });
}

function renderCaseSelect() {
  const select = $("[data-case-select]");
  select.innerHTML = "";
  currentCases().forEach((caseItem, index) => {
    const option = document.createElement("option");
    option.value = caseItem.case_id;
    option.textContent = `Idx ${String(index).padStart(2, "0")}`;
    option.selected = caseItem.case_id === state.caseId;
    select.appendChild(option);
  });
  select.onchange = () => setCase(select.value);
}

function moveCase(delta) {
  const cases = currentCases();
  const index = cases.findIndex((item) => item.case_id === state.caseId);
  const nextIndex = (index + delta + cases.length) % cases.length;
  setCase(cases[nextIndex].case_id);
}

function renderHeader(caseItem) {
  $("[data-case-task]").textContent = caseItem.task_label;
  $("[data-case-title]").textContent = caseItem.title;
  $("[data-case-description]").textContent = state.data.tasks.find((task) => task.task_id === caseItem.task_id)?.description || "";
  $("[data-case-split]").textContent = caseItem.split;
  $("[data-case-source]").textContent = caseItem.source_id;
  $("[data-case-span]").textContent = `[${caseItem.span.start_sec}s, ${caseItem.span.end_sec}s)`;
  $("[data-case-role]").textContent = formatRole(caseItem.subtask.target_role);
}

function noteColor(note, isTarget) {
  if (note.highlight === "changed_source") return "#b3443a";
  if (note.highlight === "changed_target") return "#2f6b4f";
  if (note.role === "melody" || note.role === "right_hand") return "#3769a8";
  if (note.role === "left_hand" || note.role === "bass") return "#b8b2a8";
  return isTarget ? "#8d7748" : "#d5aa52";
}

function noteStroke(note, isTarget) {
  if (note.highlight === "changed_source") return "#84261f";
  if (note.highlight === "changed_target") return "#1f4a36";
  if (note.role === "melody" || note.role === "right_hand") return "#244a78";
  if (note.role === "left_hand" || note.role === "bass") return "#777169";
  return isTarget ? "#675735" : "#9b792f";
}

function renderPianoRoll(caseItem) {
  const frame = $("[data-piano-roll]");
  const sourceNotes = caseItem.piano_roll.source_notes || [];
  const targetNotes = caseItem.piano_roll.target_notes || [];
  const allNotes = [...sourceNotes, ...targetNotes];
  const span = caseItem.span;
  const contextSeconds = 5;
  const windowStart = Math.max(caseItem.window.start_sec ?? 0, span.start_sec - contextSeconds);
  const windowEnd = Math.max(
    windowStart + 1,
    Math.min(caseItem.window.end_sec ?? span.end_sec + contextSeconds, span.end_sec + contextSeconds),
  );
  const visibleNotes = allNotes.filter((note) => note.end_sec > windowStart && note.start_sec < windowEnd);
  const pitchValues = visibleNotes.length ? visibleNotes.map((note) => note.pitch) : [60, 72];
  const pitchMin = Math.min(...pitchValues) - 2;
  const pitchMax = Math.max(...pitchValues) + 2;
  const pitchRange = Math.max(12, pitchMax - pitchMin + 1);
  const width = 1280;
  const panelHeight = Math.max(170, pitchRange * 8);
  const gap = 58;
  const topMargin = 38;
  const leftMargin = 58;
  const rightMargin = 18;
  const bottomMargin = 42;
  const totalHeight = topMargin + panelHeight * 2 + gap + bottomMargin;
  const rollWidth = width - leftMargin - rightMargin;
  const timeSpan = windowEnd - windowStart || 1;
  const x = (seconds) => leftMargin + ((seconds - windowStart) / timeSpan) * rollWidth;
  const y = (pitch, panelOffset) => panelOffset + panelHeight - ((pitch - pitchMin) / pitchRange) * panelHeight;
  const noteHeight = Math.max(5.5, Math.min(10, panelHeight / pitchRange * 0.72));
  const panelOffsets = [topMargin, topMargin + panelHeight + gap];

  const svgParts = [
    `<svg viewBox="0 0 ${width} ${totalHeight}" role="img" aria-label="Original And Predicted Piano Roll">`,
    `<rect x="0" y="0" width="${width}" height="${totalHeight}" fill="#fff"/>`,
  ];

  function drawPanel(notes, offset, label, isTarget) {
    svgParts.push(`<text x="${leftMargin}" y="${offset - 13}" font-size="17" font-family="Source Serif 4, serif" fill="#171717">${label}</text>`);
    svgParts.push(`<rect x="${leftMargin}" y="${offset}" width="${rollWidth}" height="${panelHeight}" fill="#ffffff" stroke="#d8d2c8"/>`);
    svgParts.push(`<rect x="${x(span.start_sec)}" y="${offset}" width="${Math.max(1, x(span.end_sec) - x(span.start_sec))}" height="${panelHeight}" fill="#f4d77a" opacity="0.28"/>`);

    const tickStep = timeSpan > 12 ? 2 : timeSpan > 7 ? 1 : 0.5;
    const ticks = [];
    for (let t = Math.ceil(windowStart / tickStep) * tickStep; t <= windowEnd + 1e-6; t += tickStep) ticks.push(Number(t.toFixed(2)));
    ticks.forEach((tick) => {
      const xx = x(tick);
      svgParts.push(`<line x1="${xx}" y1="${offset}" x2="${xx}" y2="${offset + panelHeight}" stroke="#d8d2c8" opacity="${Math.abs(tick - Math.round(tick)) < 1e-6 ? 0.55 : 0.24}"/>`);
      if (isTarget) {
        svgParts.push(`<text x="${xx}" y="${offset + panelHeight + 17}" text-anchor="middle" font-size="10" fill="#706d66">${tick.toFixed(1)}s</text>`);
      }
    });

    const pitchTicks = [...new Set(visibleNotes.map((note) => note.pitch))].sort((a, b) => a - b);
    pitchTicks.forEach((pitch) => {
      const yy = y(pitch, offset);
      svgParts.push(`<line x1="${leftMargin}" y1="${yy}" x2="${leftMargin + rollWidth}" y2="${yy}" stroke="#d8d2c8" opacity="0.13"/>`);
      svgParts.push(`<text x="${leftMargin - 8}" y="${yy + 3}" text-anchor="end" font-size="10" fill="#706d66">${midiToNoteName(pitch)}</text>`);
    });

    if (!notes.length) {
      svgParts.push(`<text x="${leftMargin + rollWidth / 2}" y="${offset + panelHeight / 2}" text-anchor="middle" font-size="18" fill="#706d66">No Original Context For Generation</text>`);
    }

    notes.forEach((note) => {
      if (note.end_sec <= windowStart || note.start_sec >= windowEnd) return;
      const x1 = Math.max(leftMargin, x(note.start_sec));
      const x2 = Math.min(leftMargin + rollWidth, x(note.end_sec));
      const yy = y(note.pitch, offset);
      const widthRect = Math.max(3, x2 - x1);
      const fill = noteColor(note, isTarget);
      const stroke = noteStroke(note, isTarget);
      svgParts.push(`<rect x="${x1.toFixed(2)}" y="${(yy - noteHeight / 2).toFixed(2)}" width="${widthRect.toFixed(2)}" height="${noteHeight.toFixed(2)}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`);
      if (widthRect > 34 || note.highlight !== "preserved") {
        svgParts.push(`<text x="${(x1 + 4).toFixed(2)}" y="${(yy + 3).toFixed(2)}" font-size="10" fill="#171717">${midiToNoteName(note.pitch)}</text>`);
      }
    });
  }

  drawPanel(sourceNotes, panelOffsets[0], `${caseItem.piano_roll.original_label} (상)`, false);
  drawPanel(targetNotes, panelOffsets[1], `${caseItem.piano_roll.predicted_label} (하)`, true);

  svgParts.push(`</svg>`);
  frame.innerHTML = svgParts.join("");
  $("[data-piano-caption]").textContent = `${caseItem.title}. The view shows up to ±5 seconds around the edit span ${span.start_sec}s–${span.end_sec}s; unedited context remains visible around the highlighted region.`;
}

function midiToNoteName(pitch) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

function renderEvidence(caseItem) {
  const container = $("[data-evidence-list]");
  container.innerHTML = "";
  const evidenceItems = [];
  caseItem.preprocess_steps[2].fields.forEach((field) => evidenceItems.push(field));
  caseItem.controls.forEach((control) => {
    evidenceItems.push({
      label: control.control_id,
      value: `${control.canonical_phrase} · ${control.proxy?.satisfied ? "supported" : "not supported"}`,
    });
  });
  evidenceItems.forEach((item) => {
    const card = el("div", "evidence-item");
    card.appendChild(el("span", "", item.label));
    card.appendChild(el("strong", "", item.value));
    container.appendChild(card);
  });
}

function renderPrompts(caseItem) {
  const container = $("[data-prompt-stack]");
  container.innerHTML = "";
  [...caseItem.prompts].sort((a, b) => promptOrder.indexOf(a.prompt_family) - promptOrder.indexOf(b.prompt_family)).forEach((prompt) => {
    const card = el("div", "prompt-item");
    card.appendChild(el("span", "", `${prompt.prompt_family} · ${prompt.training_stage}`));
    const strong = document.createElement("strong");
    strong.innerHTML = `<code>${prompt.prompt_family}</code>`;
    card.appendChild(strong);
    card.appendChild(el("p", "", prompt.rendered_text));
    if (prompt.omitted_features) {
      const omitted = el("p", "caption", `Omitted: ${prompt.omitted_features}`);
      card.appendChild(omitted);
    }
    container.appendChild(card);
  });
}

function renderProcess(caseItem) {
  const container = $("[data-process-steps]");
  container.innerHTML = "";
  caseItem.preprocess_steps.forEach((step) => {
    const card = el("article", "process-step");
    card.appendChild(el("span", "", step.title));
    card.appendChild(el("p", "", step.body));
    const dl = el("dl", "step-fields");
    step.fields.forEach((field) => {
      const wrapper = el("div", "step-field");
      wrapper.appendChild(el("dt", "", field.label));
      wrapper.appendChild(el("dd", "", field.value));
      dl.appendChild(wrapper);
    });
    card.appendChild(dl);
    container.appendChild(card);
  });
}

function renderValidation(caseItem) {
  const table = $("[data-validation-table]");
  const deterministic = caseItem.validation.deterministic || {};
  const rows = [
    ["target_parse_ok", deterministic.target_parse_ok],
    ["span_iou", deterministic.span_iou],
    ["outside_change_rate", deterministic.outside_change_rate],
    ["task_success", deterministic.task_success],
    ["changed_roles", caseItem.diff_evidence.changed_roles?.join(", ")],
    ["n_changed_notes", caseItem.diff_evidence.n_changed_notes],
  ];
  table.innerHTML = rows.map(([key, value]) => `<tr><th>${key}</th><td>${value}</td></tr>`).join("");
}

function renderRaw(caseItem) {
  const raw = {
    case_id: caseItem.case_id,
    span: caseItem.span,
    subtask: caseItem.subtask,
    edit_plan: caseItem.edit_plan,
    evidence: caseItem.evidence,
    controls: caseItem.controls,
    validation: caseItem.validation,
  };
  $("[data-raw-json]").textContent = JSON.stringify(raw, null, 2);
}

function renderAll() {
  renderHeroMenus();
  renderTaskTabs();
  renderCaseSelect();
  const caseItem = currentCase();
  renderHeader(caseItem);
  renderPianoRoll(caseItem);
  renderEvidence(caseItem);
  renderPrompts(caseItem);
  renderProcess(caseItem);
  renderValidation(caseItem);
  renderRaw(caseItem);
}

async function init() {
  const response = await fetch("assets/data/cases.json?v=20260713-idx-only");
  if (!response.ok) throw new Error(`Failed to load cases.json: ${response.status}`);
  state.data = await response.json();
  state.taskId = state.data.tasks[0].task_id;
  state.caseId = state.data.cases.find((item) => item.task_id === state.taskId)?.case_id;
  $("[data-case-prev]").addEventListener("click", () => moveCase(-1));
  $("[data-case-next]").addEventListener("click", () => moveCase(1));
  document.querySelectorAll("[data-metric-toggle]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMetricMenu(button.dataset.metricToggle);
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-metric-picker]")) {
      closeMetricMenus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMetricMenus();
    }
  });
  renderAll();
}

init().catch((error) => {
  console.error(error);
  $("[data-case-title]").textContent = "Failed To Load Dashboard Data";
  $("[data-case-description]").textContent = String(error);
});
