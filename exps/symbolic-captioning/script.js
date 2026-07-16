const state = {
  data: null,
  metadataData: null,
  metadataCategory: "key",
  metadataVersionByCategory: {},
  metadataStageByVersion: {},
  backend: "A",
  scopeType: "whole_piece",
  caseIndex: 0,
};

function releaseId() {
  return state.data?.release_id || "A.1.2";
}

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
  if (value.note_count !== undefined && value.overall_direction?.value) return `${value.note_count} Notes · ${formatLabel(value.overall_direction.value)}`;
  if (value.note_count !== undefined) return `${value.note_count} Notes`;
  if (value.dominant_inter_onset_beat !== undefined) return `Dominant IOI ${value.dominant_inter_onset_beat} Beat`;
  if (value.note_onsets_per_beat !== undefined) return `${value.total_note_onsets} Onsets · ${value.note_onsets_per_beat} / Beat`;
  if (value.mean_velocity !== undefined) return value.overall_direction ? `Mean ${value.mean_velocity} · ${formatLabel(value.overall_direction)}` : `Mean Velocity ${value.mean_velocity}`;
  if (value.bar_count_from_downbeats !== undefined) return `${value.bar_count_from_downbeats} Bars · ${value.duration_sec} Sec`;
  if (value.total_note_onsets !== undefined) return `${value.total_note_onsets} Onsets`;
  return JSON.stringify(value);
}

function scopedCases() {
  return (state.data?.cases || []).filter((caseItem) => caseItem.scope_type === state.scopeType);
}

function currentCase() {
  return scopedCases()[state.caseIndex] || null;
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

function currentMetadataStage() {
  const version = currentMetadataVersion();
  if (!version) return null;
  const selectedStage = state.metadataStageByVersion[version.id] || version.default_stage;
  return version.diagram.find((stage) => stage.id === selectedStage) || version.diagram[0] || null;
}

function actualDatasetCase() {
  const caseId = state.metadataData?.actual_dataset_example?.case_id;
  return state.data?.cases?.find((caseItem) => caseItem.case_id === caseId) || null;
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
    const marker = version.id === category.current_version
      ? '<em class="current">Current</em>'
      : version.diagram.some((stage) => stage.artifact_kind === "actual_metadata")
        ? '<em class="observed">Train Data</em>'
        : "";
    button.innerHTML = `<strong>${version.id}</strong><span>${version.status}</span>${marker}`;
    button.addEventListener("click", () => {
      state.metadataVersionByCategory[category.id] = version.id;
      renderMetadataExplorer();
    });
    container.appendChild(button);
  });
}

function renderMetadataDiagram(version) {
  const selectedStage = currentMetadataStage();
  const container = $("[data-metadata-diagram]");
  container.innerHTML = "";
  version.diagram.forEach((step, index) => {
    const node = document.createElement("button");
    const isActive = step.id === selectedStage.id;
    node.type = "button";
    node.className = `metadata-diagram-node${isActive ? " active" : ""}`;
    node.setAttribute("role", "tab");
    node.setAttribute("aria-selected", String(isActive));
    node.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${step.title}</strong><small>${step.detail}</small>`;
    node.addEventListener("click", () => {
      state.metadataStageByVersion[version.id] = step.id;
      renderMetadataDetail();
    });
    container.appendChild(node);
    if (index < version.diagram.length - 1) {
      const arrow = document.createElement("i");
      arrow.className = "metadata-diagram-arrow";
      arrow.setAttribute("aria-hidden", "true");
      container.appendChild(arrow);
    }
  });
}

const METADATA_STAGE_SUMMARIES = {
  synthetic_fixture: "This stage contains only deterministic synthetic MIDI coverage and expected facts used to test later extraction. It is not corpus metadata and does not involve an LLM.",
  canonical_example: "This stage shows the schema-aligned canonical record expected from the selected fixture. It contains metadata evidence only; no caption prompt or Gemini output belongs here.",
  evidence_gate: "This stage applies status and lexical-strength policy to canonical evidence. The operation is deterministic and decides which claims may enter a projection.",
  projection_contract: "This stage produces a compact structured CaptionProjection for a downstream caption model. It is structured data, not the natural-language prompt sent to Gemini.",
  actual_source: "This stage shows only the observed POP909 Train source window and input provenance used by the executed pilot extractor.",
  actual_extractor: "This stage shows only the rule or dataset-annotation evidence source used to derive the selected metadata family.",
  actual_metadata: "This stage shows the family-specific metadata actually extracted from POP909 Train. Fields from other metadata families and caption-model outputs are excluded.",
  actual_caption: "This downstream stage alone shows the actual caption-realization prompt and Gemini response recorded for the same Train segment. The prompt consumes the combined General Metadata, so family isolation ends at this boundary.",
};

function pickFields(value, fields) {
  if (!value || !fields) return value;
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(value, field)).map((field) => [field, value[field]]));
}

function actualFamilyView(category) {
  const caseItem = actualDatasetCase();
  const viewConfig = state.metadataData.actual_dataset_example.family_views[category.id];
  if (!caseItem || !viewConfig) return null;
  const evidence = caseItem.supported_evidence?.[viewConfig.evidence_key];
  const blocked = (caseItem.blocked_evidence || []).filter((item) =>
    viewConfig.blocked_prefixes.some((prefix) => item.startsWith(prefix))
  );
  return {
    artifact_type: "actual_train_extractor_output",
    provenance: {
      case_id: caseItem.case_id,
      source_id: caseItem.source_id,
      dataset: "POP909",
      split: caseItem.split,
      source_kind: caseItem.source_kind,
      window: caseItem.window,
      evidence_sha256: caseItem.provenance.evidence_sha256,
    },
    family: category.id,
    supported_evidence: {
      [viewConfig.evidence_key]: pickFields(evidence, viewConfig.fields),
    },
    uncertain_or_unknown_evidence: blocked,
  };
}

function canonicalEvidence(version) {
  return version.example_metadata?.composition_view?.evidence?.[0] || null;
}

function syntheticFixtureArtifact(version, category) {
  const evidence = canonicalEvidence(version);
  return {
    artifact_type: "synthetic_fixture_expectation",
    source_type: "deterministic_synthetic_midi",
    fixture_id: version.example_metadata.fixture_id,
    metadata_family: category.id,
    validation_target: version.diagram[0].detail,
    expected_scope: version.example_metadata.caption_span || null,
    expected_value: evidence?.value || version.example_metadata.temporal_map,
    corpus_split: null,
  };
}

function evidenceGateArtifact(version, category) {
  const evidence = canonicalEvidence(version);
  return {
    artifact_type: "deterministic_evidence_gate",
    metadata_family: category.id,
    selected_feature: evidence?.feature_id || "temporal.temporal_map",
    status_policy: [
      {status: "supported", caption_eligible: true, lexical_strength: ["assertive", "centered", "suggestive"]},
      {status: "ambiguous", caption_eligible: false, lexical_strength: ["omit"]},
      {status: "insufficient_evidence", caption_eligible: false, lexical_strength: ["omit"]},
      {status: "conflict", caption_eligible: false, lexical_strength: ["omit"]},
      {status: "extractor_failed", caption_eligible: false, lexical_strength: ["omit"]}
    ],
    llm_involved: false,
  };
}

function projectionArtifact(version, category) {
  const evidence = canonicalEvidence(version);
  const featureId = evidence?.feature_id || "temporal.temporal_map";
  const value = evidence?.value || version.example_metadata.temporal_map;
  return {
    projection_version: "sori_caption_projection_v0.1",
    profile: "caption_pretraining",
    source_metadata: `synthetic:${version.example_metadata.fixture_id}`,
    input_modalities: ["midi"],
    allowed_claims: [
      {
        claim_id: `claim.${category.id}`,
        feature_id: featureId,
        value,
        assertion_level: evidence?.assertion_level || "assertive",
        evidence_ids: [evidence?.evidence_id || "temporal_map@caption_span"],
      },
    ],
    blocked_claims: [],
    downstream_stage: "caption_realization_prompt_assembly",
  };
}

function actualSourceArtifact(caseItem) {
  return {
    artifact_type: "actual_corpus_source_window",
    source_id: caseItem.source_id,
    dataset: "POP909",
    split: caseItem.split,
    source_kind: caseItem.source_kind,
    input_modalities: caseItem.input_modalities,
    window: caseItem.window,
    retained_media: {
      midi: caseItem.media?.midi || null,
      vst_rendered_audio: caseItem.media?.audio || null,
    },
  };
}

function actualExtractorArtifact(category, caseItem) {
  const viewConfig = state.metadataData.actual_dataset_example.family_views[category.id];
  const evidence = caseItem.supported_evidence[viewConfig.evidence_key];
  const fallbackMethods = {
    notes: "POP909 MELODY track annotation and exact note-event serialization",
    rhythm: "POP909 MELODY track note-on and duration normalization in beats",
    texture: "MIDI note-on aggregation by POP909 role track",
  };
  return {
    artifact_type: "executed_pilot_extractor_stage",
    metadata_family: category.id,
    evidence_key: viewConfig.evidence_key,
    method: evidence.method || fallbackMethods[category.id],
    role_source: evidence.role_source || null,
    scope: evidence.scope || "selected_segment",
    confidence: evidence.confidence,
    status: evidence.status,
    canonical_v0_1_output: false,
  };
}

function metadataStageArtifacts(version, category, stage) {
  const caseItem = actualDatasetCase();
  const actualLabel = state.metadataData.actual_dataset_example.display_name;
  if (stage.artifact_kind === "synthetic_fixture") {
    return [{kicker: "Synthetic Test Input", title: "Fixture Expectation", note: "Not Train Or Test Data", content: syntheticFixtureArtifact(version, category)}];
  }
  if (stage.artifact_kind === "canonical_example") {
    return [{kicker: "Canonical Metadata", title: version.example_label, note: version.example_note, content: version.example_metadata}];
  }
  if (stage.artifact_kind === "evidence_gate") {
    return [{kicker: "Deterministic Policy", title: "Evidence Eligibility Rules", note: "No LLM Involved", content: evidenceGateArtifact(version, category)}];
  }
  if (stage.artifact_kind === "projection_contract") {
    return [{kicker: "Structured Downstream Input", title: "CaptionProjection Example", note: "Not A Gemini Prompt", content: projectionArtifact(version, category)}];
  }
  if (!caseItem) {
    return [{kicker: "Missing Artifact", title: "Actual Dataset Case Unavailable", note: "Viewer Data Error", content: {case_id: state.metadataData.actual_dataset_example.case_id}}];
  }
  if (stage.artifact_kind === "actual_source") {
    return [{kicker: "Observed Corpus Input", title: "Actual Train Source Window", note: actualLabel, content: actualSourceArtifact(caseItem)}];
  }
  if (stage.artifact_kind === "actual_extractor") {
    return [{kicker: "Executed Extraction", title: `${category.label} Evidence Source`, note: actualLabel, content: actualExtractorArtifact(category, caseItem)}];
  }
  if (stage.artifact_kind === "actual_metadata") {
    return [{kicker: "Observed Corpus Output", title: `Actual Train ${category.label} Metadata`, note: actualLabel, content: actualFamilyView(category)}];
  }
  return [
    {kicker: "Actual LLM Input", title: "Caption Realization Prompt", note: `Gemini Web · ${releaseId()}`, content: caseItem.prompt},
    {kicker: "Actual LLM Output", title: "Recorded Raw Caption", note: `${caseItem.provenance.model} · ${caseItem.provenance.elapsed_sec.toFixed(2)} Sec`, content: {response: caseItem.response, provenance: caseItem.provenance}},
  ];
}

function renderMetadataArtifacts(artifacts) {
  const container = $("[data-metadata-stage-artifacts]");
  container.innerHTML = "";
  container.classList.toggle("single", artifacts.length === 1);
  artifacts.forEach((artifact) => {
    const card = document.createElement("section");
    card.className = "metadata-code-card";
    const head = document.createElement("div");
    head.className = "metadata-code-head";
    const titleWrap = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "section-kicker";
    kicker.textContent = artifact.kicker;
    const title = document.createElement("h3");
    title.textContent = artifact.title;
    const note = document.createElement("span");
    note.textContent = artifact.note;
    const content = document.createElement("pre");
    content.textContent = typeof artifact.content === "string" ? artifact.content : JSON.stringify(artifact.content, null, 2);
    titleWrap.append(kicker, title);
    head.append(titleWrap, note);
    card.append(head, content);
    container.appendChild(card);
  });
}

function renderMetadataStage(version, category) {
  const stage = currentMetadataStage();
  const stageIndex = version.diagram.findIndex((item) => item.id === stage.id) + 1;
  const isActual = stage.artifact_kind.startsWith("actual_");
  const isContract = ["evidence_gate", "projection_contract"].includes(stage.artifact_kind);
  const source = $("[data-metadata-stage-source]");
  $("[data-metadata-stage-kicker]").textContent = `${version.id} · Pipeline Stage ${String(stageIndex).padStart(2, "0")}`;
  $("[data-metadata-stage-title]").textContent = stage.title;
  $("[data-metadata-stage-summary]").textContent = METADATA_STAGE_SUMMARIES[stage.artifact_kind];
  source.textContent = isActual ? "Actual POP909 Train" : isContract ? "Contract Only" : "Synthetic Phase 0";
  source.className = `stage-source-badge ${isActual ? "actual" : isContract ? "contract" : "synthetic"}`;
  renderMetadataArtifacts(metadataStageArtifacts(version, category, stage));
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
  renderMetadataStage(version, category);
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
  $("[data-metric='structural-pass']").textContent = `${state.data.summary.structurally_accepted}/${runs}`;
  $("[data-metric='preflight-flags']").textContent = state.data.summary.semantic_preflight_flagged;
  $("[data-release-runs]").textContent = runs;
}

function renderScopePicker() {
  const picker = $("[data-scope-picker]");
  picker.innerHTML = "";
  const options = [
    ["whole_piece", "Whole Piece", "Training Default"],
    ["region_in_full_context", "Region In Full Context", "Selector Pending"],
    ["cropped_region_legacy", "Cropped Region Legacy", "Ablation Only"],
  ];
  options.forEach(([scopeType, label, note]) => {
    const button = document.createElement("button");
    const active = scopeType === state.scopeType;
    button.type = "button";
    button.className = `scope-button${active ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(active));
    button.innerHTML = `<strong>${label}</strong><small>${note}</small>`;
    button.addEventListener("click", () => {
      state.scopeType = scopeType;
      state.caseIndex = 0;
      const url = new URL(window.location.href);
      url.searchParams.set("scope", scopeType);
      window.history.replaceState({}, "", url);
      renderScopePicker();
      renderCasePicker();
      renderCase();
    });
    picker.appendChild(button);
  });
}

function renderCasePicker() {
  const picker = $("[data-case-picker]");
  picker.innerHTML = "";
  const label = document.createElement("label");
  label.className = "case-select-label";
  label.innerHTML = `<span>Case Index</span><strong>Select An Actual Train Example</strong>`;
  const select = document.createElement("select");
  select.className = "case-select";
  select.setAttribute("aria-label", "Case Index");
  const cases = scopedCases();
  cases.forEach((caseItem, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    const target = caseItem.scope_type === "whole_piece"
      ? "Entire Piece"
      : `Bars ${caseItem.window.start_bar}–${caseItem.window.end_bar_exclusive - 1}`;
    option.textContent = `IDX ${String(index).padStart(2, "0")} · ${caseItem.source_id.toUpperCase()} · ${target}`;
    option.selected = index === state.caseIndex;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    state.caseIndex = Number(select.value);
    renderCase();
  });
  label.appendChild(select);
  const navigation = document.createElement("div");
  navigation.className = "case-navigation";
  [["Previous", -1], ["Next", 1]].forEach(([text, offset]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "case-nav-button";
    button.textContent = text;
    button.disabled = state.caseIndex + offset < 0 || state.caseIndex + offset >= cases.length;
    button.addEventListener("click", () => {
      state.caseIndex += offset;
      renderCasePicker();
      renderCase();
    });
    navigation.appendChild(button);
  });
  picker.append(label, navigation);
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
    renderScopePicker();
    renderCasePicker();
    renderCase();
  }
}

function originText(caseItem) {
  const window = caseItem.window || {};
  const segment = caseItem.scope_type === "whole_piece"
    ? "the entire MIDI piece"
    : `bars ${window.start_bar}–${Math.max(window.start_bar, (window.end_bar_exclusive || window.start_bar + 1) - 1)}`;
  const provenance = caseItem.source_kind === "Actual Train Split"
    ? `${caseItem.source_id.toUpperCase()}, ${segment}`
    : `${caseItem.source_kind}, ${segment}`;
  return `${provenance}; ${caseItem.scope_label} metadata rendered by ${caseItem.provenance.model} through Gemini Web.`;
}

function renderCase() {
  const caseItem = currentCase();
  if (!caseItem) return;
  $("[data-case-release]").textContent = `${caseItem.release_id || releaseId()} · ${caseItem.scope_label}`;
  $("[data-case-name]").textContent = caseItem.title;
  $("[data-case-origin]").textContent = originText(caseItem);
  $("[data-case-source]").textContent = caseItem.source_id;
  $("[data-case-split]").textContent = formatLabel(caseItem.split);
  $("[data-case-scope]").textContent = caseItem.scope_label;
  $("[data-case-asset-scope]").textContent = formatLabel(caseItem.scope_contract.input_asset_scope);
  $("[data-case-gemini-input]").textContent = caseItem.input_modalities.length ? caseItem.input_modalities.map(formatLabel).join(" + ") : "Metadata Only";
  $("[data-case-training-use]").textContent = caseItem.scope_contract.training_eligible ? "Training Default" : "Diagnostic Only";
  $("[data-caption-short]").textContent = caseItem.response.caption_short;
  $("[data-caption-detailed]").textContent = caseItem.response.caption_detailed;
  $("[data-latency]").textContent = `${caseItem.provenance.elapsed_sec.toFixed(2)} Sec`;
  $("[data-researcher-note]").textContent = caseItem.researcher_audit;
  $("[data-filter-state]").textContent = `Pending In ${releaseId()}`;
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
  const scopeLabels = {
    whole_piece: "Whole MIDI Piece",
    region_in_full_context: "Full Piece · Target Region",
    cropped_region_legacy: "Cropped Region",
  };
  status.textContent = hasMedia ? scopeLabels[caseItem.scope_type] : "Evidence Only";
  status.className = `status-pill${hasMedia ? " complete" : ""}`;
  $("[data-media-title]").textContent = media.audio ? "Piano Roll And Render" : "Piano Roll";

  if (media.audio) {
    audio.hidden = false;
    audio.src = media.audio;
  } else {
    audio.hidden = true;
    audio.removeAttribute("src");
    audio.load();
  }

  if (media.midi) {
    midiLink.href = media.midi;
    midiLink.hidden = false;
  } else {
    midiLink.hidden = true;
  }

  const span = media.caption_span_asset_sec || [0, media.duration_sec || 0];
  const spanText = caseItem.scope_type === "whole_piece"
    ? "The entire piece is the caption target."
    : `The highlighted target spans ${span[0].toFixed(2)}–${span[1].toFixed(2)} seconds in this asset.`;
  $("[data-media-note]").textContent = hasMedia
    ? `${spanText} ${media.render_note}`
    : "This recorded pilot used controlled MIDI-derived metadata without a retained media attachment.";

  if (notes.length) requestAnimationFrame(() => drawPianoRoll(canvas, notes, media.duration_sec || 1, span));
}

function drawPianoRoll(canvas, notes, duration, captionSpan = null) {
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

  const tickStep = duration > 180 ? 30 : duration > 60 ? 10 : duration > 20 ? 5 : duration > 8 ? 2 : 1;
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

  if (captionSpan && (captionSpan[0] > 0 || captionSpan[1] < duration)) {
    const start = x(Math.max(0, captionSpan[0]));
    const end = x(Math.min(duration, captionSpan[1]));
    context.fillStyle = "rgba(55, 105, 168, 0.12)";
    context.fillRect(start, margin.top, Math.max(1, end - start), plotHeight);
    context.strokeStyle = "rgba(55, 105, 168, 0.8)";
    context.lineWidth = 1.5;
    context.strokeRect(start, margin.top, Math.max(1, end - start), plotHeight);
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
  if (kind === "prompt") return { kicker: `${releaseId()} · Exact Request`, title: "Captioning Prompt", content: caseItem.prompt };
  if (kind === "evidence") return { kicker: `${releaseId()} · Required Input`, title: "General Metadata", content: JSON.stringify({ supported_evidence: caseItem.supported_evidence, uncertain_or_unknown_evidence: caseItem.blocked_evidence }, null, 2) };
  return { kicker: `${releaseId()} · Recorded Artifact`, title: "Raw Result JSON", content: JSON.stringify({ response: caseItem.response, provenance: caseItem.provenance, validation: caseItem.validation, artifact_paths: caseItem.artifact_paths }, null, 2) };
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
    if (state.backend === "A" && caseItem?.media?.notes?.length) drawPianoRoll($("[data-piano-roll]"), caseItem.media.notes, caseItem.media.duration_sec || 1, caseItem.media.caption_span_asset_sec);
  });
}

async function initialize() {
  try {
    const [summaryResponse, metadataResponse] = await Promise.all([
      fetch("assets/data/summary.json", { cache: "no-store" }),
      fetch("assets/data/metadata_versions.json?schema=v0.2&ui=a112", { cache: "no-store" }),
    ]);
    if (!summaryResponse.ok) throw new Error(`Summary HTTP ${summaryResponse.status}`);
    if (!metadataResponse.ok) throw new Error(`Metadata HTTP ${metadataResponse.status}`);
    state.data = await summaryResponse.json();
    state.metadataData = await metadataResponse.json();
    const requestedScope = new URLSearchParams(window.location.search).get("scope");
    const availableScopes = new Set(state.data.cases.map((caseItem) => caseItem.scope_type));
    if (availableScopes.has(requestedScope)) state.scopeType = requestedScope;
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
