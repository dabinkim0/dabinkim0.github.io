(function () {
  "use strict";

  const denseState = {
    index: null,
    sample: null,
    projection: null,
    sampleIndex: 0,
    scale: "all",
    stage: "canonical",
    view: "global",
    requestToken: 0,
  };

  const pipelineStages = [
    {
      id: "source",
      index: "01",
      version: "Registry",
      title: "Source",
      status: "supported",
      statusLabel: "Available",
      description: "Registered POP909 MIDI provenance and the deterministically selected audit span.",
    },
    {
      id: "canonical",
      index: "02",
      version: "M.0.4",
      title: "Canonical Evidence",
      status: "supported",
      statusLabel: "Available",
      description: "Typed rule-based audit evidence with explicit units, provenance, and unavailable fields. This artifact is not sent directly to Gemini.",
    },
    {
      id: "projection",
      index: "03",
      version: "P.0.1",
      title: "Compact Projection",
      status: "supported",
      statusLabel: "Available",
      description: "Provider-neutral global and timestamped local metadata with allowed and blocked claims.",
    },
    {
      id: "llm_input",
      index: "04",
      version: "J.0.1",
      title: "Exact LLM Input",
      status: "not_assembled",
      statusLabel: "Not Assembled",
      description: "The exact text prompt, optional attachment manifest, and immutable request hash.",
    },
    {
      id: "raw_output",
      index: "05",
      version: "A / B",
      title: "Raw LLM Output",
      status: "not_generated",
      statusLabel: "Not Executed",
      description: "The verbatim Gemini response linked to one immutable request record.",
    },
    {
      id: "final_caption",
      index: "06",
      version: "F.0.1",
      title: "Filtered Final Caption",
      status: "not_generated",
      statusLabel: "Not Generated",
      description: "Evidence-filtered caption candidate retained for dataset review.",
    },
  ];

  function get(selector) {
    return document.querySelector(selector);
  }

  function formatLabel(value) {
    return String(value || "—")
      .replaceAll("_", " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function currentStage() {
    return pipelineStages.find(function (stage) {
      return stage.id === denseState.stage;
    }) || pipelineStages[1];
  }

  function statusClass(status) {
    return String(status || "unknown").replaceAll("_", "-");
  }

  function statusBadge(text, status) {
    const badge = document.createElement("span");
    badge.className = "dense-status " + statusClass(status);
    badge.textContent = text;
    return badge;
  }

  function samples() {
    const allSamples = denseState.index ? denseState.index.samples : [];
    if (denseState.scale === "all") return allSamples;
    return allSamples.filter(function (sample) {
      return String(sample.scale_bars) === denseState.scale;
    });
  }

  function currentEntry() {
    return samples()[denseState.sampleIndex] || null;
  }

  function renderMetrics() {
    if (!denseState.index) return;
    const counts = denseState.index.implementation_status_counts;
    const values = [
      ["[data-dense-sample-count]", denseState.index.sample_count],
      ["[data-dense-implemented-count]", counts.implemented || 0],
      ["[data-dense-partial-count]", counts.partial || 0],
      ["[data-dense-missing-count]", counts.not_implemented || 0],
    ];
    values.forEach(function (entry) {
      const node = get(entry[0]);
      if (node) node.textContent = entry[1];
    });
    const projectionCount = get("[data-dense-projection-count]");
    if (projectionCount) projectionCount.textContent = denseState.index.projection_count || 0;
  }

  function renderFeatureMatrix() {
    const container = get("[data-dense-feature-matrix]");
    container.innerHTML = "";
    const groups = [
      ["implemented", "Implemented"],
      ["partial", "Partial"],
      ["not_implemented", "Not Implemented"],
    ];
    groups.forEach(function (groupSpec) {
      const status = groupSpec[0];
      const label = groupSpec[1];
      const features = denseState.index.feature_catalog.filter(function (feature) {
        return feature.implementation_status === status;
      });
      const group = document.createElement("section");
      group.className = "feature-status-group " + statusClass(status);
      const header = document.createElement("header");
      const title = document.createElement("h4");
      title.textContent = label;
      header.append(title, statusBadge(String(features.length), status));
      const grid = document.createElement("div");
      grid.className = "feature-status-cards";
      features.forEach(function (feature) {
        const card = document.createElement("article");
        const name = document.createElement("strong");
        const featureId = document.createElement("code");
        const output = document.createElement("p");
        const provenance = document.createElement("small");
        name.textContent = feature.label;
        featureId.textContent = feature.feature_id;
        output.textContent = feature.output;
        provenance.textContent =
          formatLabel(feature.validation_tier) + " · " + formatLabel(feature.availability);
        card.append(name, featureId, output, provenance);
        grid.appendChild(card);
      });
      group.append(header, grid);
      container.appendChild(group);
    });
  }

  function renderPicker() {
    const picker = get("[data-dense-picker]");
    picker.innerHTML = "";
    const scaleWrap = document.createElement("div");
    scaleWrap.className = "dense-scale-picker";
    const scaleLabel = document.createElement("span");
    scaleLabel.className = "control-label";
    scaleLabel.textContent = "Bar Scale";
    const scaleButtons = document.createElement("div");
    scaleButtons.className = "dense-scale-buttons";
    ["all", "2", "4", "8", "16", "32"].forEach(function (scale) {
      const button = document.createElement("button");
      const active = denseState.scale === scale;
      button.type = "button";
      button.className = "dense-scale-button" + (active ? " active" : "");
      button.textContent = scale === "all" ? "All Scales" : scale + " Bars";
      button.setAttribute("aria-pressed", String(active));
      button.addEventListener("click", function () {
        denseState.scale = scale;
        denseState.sampleIndex = 0;
        renderPicker();
        loadSample();
      });
      scaleButtons.appendChild(button);
    });
    scaleWrap.append(scaleLabel, scaleButtons);

    const sampleWrap = document.createElement("label");
    sampleWrap.className = "dense-sample-select-label";
    const sampleLabel = document.createElement("span");
    const sampleTitle = document.createElement("strong");
    sampleLabel.textContent = "Sample Index";
    sampleTitle.textContent = "Select An Actual Train Artifact Pair";
    const select = document.createElement("select");
    select.className = "case-select";
    select.setAttribute("aria-label", "Dense Metadata Sample Index");
    const visibleSamples = samples();
    visibleSamples.forEach(function (sample, index) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent =
        "IDX " + String(index).padStart(2, "0") +
        " · " + sample.source_id.toUpperCase() +
        " · " + sample.scale_bars + " Bars" +
        " · " + sample.span_sec[0].toFixed(2) + "–" + sample.span_sec[1].toFixed(2) + " Sec";
      option.selected = index === denseState.sampleIndex;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      denseState.sampleIndex = Number(select.value);
      loadSample();
    });
    sampleWrap.append(sampleLabel, sampleTitle, select);

    const navigation = document.createElement("div");
    navigation.className = "case-navigation";
    [["Previous", -1], ["Next", 1]].forEach(function (item) {
      const button = document.createElement("button");
      const offset = item[1];
      button.type = "button";
      button.className = "case-nav-button";
      button.textContent = item[0];
      button.disabled =
        denseState.sampleIndex + offset < 0 ||
        denseState.sampleIndex + offset >= visibleSamples.length;
      button.addEventListener("click", function () {
        denseState.sampleIndex += offset;
        renderPicker();
        loadSample();
      });
      navigation.appendChild(button);
    });
    const sampleRow = document.createElement("div");
    sampleRow.className = "dense-sample-picker-row";
    sampleRow.append(sampleWrap, navigation);
    picker.append(scaleWrap, sampleRow);
  }

  function renderStages() {
    const container = get("[data-dense-stages]");
    if (!container) return;
    container.innerHTML = "";
    pipelineStages.forEach(function (stage) {
      const button = document.createElement("button");
      const index = document.createElement("span");
      const body = document.createElement("span");
      const title = document.createElement("strong");
      const version = document.createElement("small");
      const status = document.createElement("em");
      const active = denseState.stage === stage.id;
      button.type = "button";
      button.className =
        "dense-stage-button " + statusClass(stage.status) + (active ? " active" : "");
      button.setAttribute("aria-pressed", String(active));
      index.className = "dense-stage-index";
      index.textContent = stage.index;
      title.textContent = stage.title;
      version.textContent = stage.version;
      status.textContent = stage.statusLabel;
      body.append(title, version);
      button.append(index, body, status);
      button.addEventListener("click", function () {
        denseState.stage = stage.id;
        if (stage.id === "canonical") denseState.view = "global";
        if (stage.id === "projection") denseState.view = "compact";
        renderStages();
        renderStageSummary();
        renderTabs();
        renderContent();
      });
      container.appendChild(button);
    });
  }

  function renderStageSummary() {
    const stage = currentStage();
    const kicker = get("[data-dense-stage-kicker]");
    const title = get("[data-dense-stage-title]");
    const description = get("[data-dense-stage-description]");
    const status = get("[data-dense-stage-status]");
    if (!kicker || !title || !description || !status) return;
    kicker.textContent = "Stage " + stage.index + " · " + stage.version;
    title.textContent = stage.title;
    description.textContent = stage.description;
    status.className = "dense-status " + statusClass(stage.status);
    status.textContent = stage.statusLabel;
  }

  function appendJsonCard(container, kicker, title, status, content, note) {
    const card = document.createElement("article");
    card.className = "dense-data-card";
    const header = document.createElement("header");
    const heading = document.createElement("div");
    const kickerNode = document.createElement("p");
    const titleNode = document.createElement("h4");
    kickerNode.className = "section-kicker";
    kickerNode.textContent = kicker;
    titleNode.textContent = title;
    heading.append(kickerNode, titleNode);
    header.appendChild(heading);
    if (status) header.appendChild(statusBadge(formatLabel(status), status));
    card.appendChild(header);
    if (note) {
      const noteNode = document.createElement("p");
      noteNode.className = "dense-data-note";
      noteNode.textContent = note;
      card.appendChild(noteNode);
    }
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(content, null, 2);
    card.appendChild(pre);
    container.appendChild(card);
  }

  function appendEventSequenceCard(container, kicker, title, sequence, statistics, note) {
    const card = document.createElement("article");
    card.className = "dense-event-sequence-card";
    const header = document.createElement("header");
    const heading = document.createElement("div");
    const kickerNode = document.createElement("p");
    const titleNode = document.createElement("h4");
    kickerNode.className = "section-kicker";
    kickerNode.textContent = kicker;
    titleNode.textContent = title;
    heading.append(kickerNode, titleNode);
    header.append(heading, statusBadge(formatLabel(sequence.status), sequence.status));
    card.appendChild(header);

    const noteNode = document.createElement("p");
    noteNode.className = "dense-data-note";
    noteNode.textContent = note;
    card.appendChild(noteNode);

    const schema = document.createElement("div");
    schema.className = "dense-event-schema";
    const signature = document.createElement("code");
    signature.textContent = "Tuple = (" + sequence.event_fields.join(", ") + ")";
    const count = document.createElement("span");
    count.textContent = sequence.event_count + " Events";
    schema.append(signature, count);
    card.appendChild(schema);

    const tableWrap = document.createElement("div");
    tableWrap.className = "dense-event-table-wrap";
    const table = document.createElement("table");
    const tableHead = document.createElement("thead");
    const headRow = document.createElement("tr");
    sequence.event_fields.forEach(function (field) {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = field.replaceAll("_", " ");
      headRow.appendChild(cell);
    });
    tableHead.appendChild(headRow);
    const tableBody = document.createElement("tbody");
    sequence.events.forEach(function (event) {
      const row = document.createElement("tr");
      event.forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value === null ? "Unknown" : String(value);
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
    table.append(tableHead, tableBody);
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);

    if (statistics) {
      const details = document.createElement("details");
      details.className = "dense-event-statistics";
      const summary = document.createElement("summary");
      const pre = document.createElement("pre");
      summary.textContent = "View Role Statistics";
      pre.textContent = JSON.stringify(statistics, null, 2);
      details.append(summary, pre);
      card.appendChild(details);
    }
    container.appendChild(card);
  }

  function renderGlobal(container, sample) {
    const globalMetadata = sample.metadata.global;
    appendJsonCard(
      container,
      "Whole-Piece Context",
      "Global Temporal Summary",
      globalMetadata.status,
      {
        scope: sample.scopes.global,
        temporal_summary: globalMetadata.temporal_summary,
      },
      "Global evidence summarizes the whole piece and does not duplicate its full note table."
    );
    appendJsonCard(
      container,
      "Whole-Piece Aggregate",
      "Global Notes And Texture",
      "supported",
      { notes: globalMetadata.notes, texture: globalMetadata.texture }
    );
    appendJsonCard(
      container,
      "Dataset Annotation",
      "Global Tonality And Harmony",
      globalMetadata.tonality_harmony.piece_key_annotation.status,
      globalMetadata.tonality_harmony,
      "The key remains an audio-derived POP909 annotation, not a MIDI-only estimate."
    );
  }

  function renderSource(container, sample) {
    appendJsonCard(
      container,
      "Registered Artifact",
      "Actual POP909 Train Source",
      "supported",
      sample.source,
      "The registry record identifies the source MIDI and immutable file hashes; it is not an LLM request."
    );
    appendJsonCard(
      container,
      "Audit Selection",
      "Global Context And Local Span",
      "supported",
      { scopes: sample.scopes, selection: sample.selection },
      "The local span is selected for extractor auditing and is explicitly marked as ineligible for training export."
    );
    appendJsonCard(
      container,
      "Parser Contract",
      "MIDI Interpretation Contract",
      sample.quality.status,
      sample.midi_contract
    );
  }

  function renderTrackRoles(container, sample) {
    const catalog = sample.metadata.global.track_catalog;
    appendEventSequenceCard(
      container,
      "Normalized Identity",
      "Track, Instrument, And Functional Role",
      {
        status: "supported",
        event_fields: [
          "track_id",
          "raw_track_name",
          "instrument",
          "functional_role",
          "role_confidence",
          "role_source",
        ],
        event_count: catalog.length,
        events: catalog.map(function (track) {
          return [
            track.track_id,
            track.raw_track_name,
            track.instrument.values.map(function (value) { return value.name; }).join(", "),
            track.functional_role,
            track.role_confidence,
            track.role_source,
          ];
        }),
      },
      null,
      "Track identity, MIDI instrument, functional role, and role confidence remain separate fields."
    );
  }

  function renderLocal(container, sample) {
    const localMetadata = sample.metadata.local;
    appendJsonCard(
      container,
      "Selected Span",
      "Local Aggregate Evidence",
      localMetadata.status,
      {
        scope: sample.scopes.local,
        active_track_ids: localMetadata.notes.active_track_ids,
        active_functional_roles: localMetadata.notes.active_functional_roles,
        note_on_event_count: localMetadata.notes.note_on_event_count,
        unique_onset_group_count: localMetadata.notes.unique_onset_group_count,
        pitch: localMetadata.notes.pitch,
        velocity: localMetadata.notes.velocity,
        observed_duration: localMetadata.notes.observed_duration,
        pitch_class_profile_duration_weighted:
          localMetadata.notes.pitch_class_profile_duration_weighted,
        texture: {
          density: localMetadata.texture.density,
          polyphony: localMetadata.texture.polyphony,
          functional_role_note_on_counts:
            localMetadata.texture.functional_role_note_on_counts,
        },
        dynamics: localMetadata.dynamics,
        tonality_harmony: localMetadata.tonality_harmony,
        relation_to_global: localMetadata.relation_to_global,
      },
      "This view summarizes the selected span. Full event objects remain available under Raw JSON."
    );
    Object.entries(localMetadata.notes.functional_role_summaries).forEach(function (entry) {
      const statistics = Object.assign({}, entry[1]);
      const sequence = statistics.event_sequence;
      delete statistics.event_sequence;
      appendEventSequenceCard(
        container,
        "Role-Aware Event Tuples",
        entry[0],
        sequence,
        statistics,
        "Each row binds pitch, relative onset, duration, and velocity to one MIDI event."
      );
    });
  }

  function renderTiming(container, sample) {
    const timing = sample.metadata.local.performance.timing_interpretation;
    appendJsonCard(
      container,
      "Direct MIDI Evidence",
      "Observed Performance Time",
      timing.observed_performance_time.status,
      timing.observed_performance_time,
      "These coordinates are observed event timing and are not interpreted as notated score values."
    );
    appendJsonCard(
      container,
      "Blocked Interpretation",
      "Quantized Score Time",
      timing.quantized_score_time.status,
      timing.quantized_score_time,
      "Note-value words remain unavailable until a validated quantization gate is implemented."
    );
    appendJsonCard(
      container,
      "Blocked Interpretation",
      "Microtiming",
      timing.microtiming.status,
      timing.microtiming,
      "Early, late, or delayed wording requires an aligned score or validated inferred grid."
    );
  }

  function renderProjection(container, projection) {
    if (denseState.view === "compact") {
      appendJsonCard(
        container,
        "Whole-Piece Projection",
        "Compact Global Metadata",
        "supported",
        projection.compact_metadata.global,
        "Audit-only ticks, track IDs, raw histograms, and full chord dictionaries are excluded."
      );
      appendJsonCard(
        container,
        "Timestamped Projection",
        "Compact Local Window",
        "supported",
        projection.compact_metadata.local_window,
        "The local window is explicitly scoped and must not be generalized to the whole piece."
      );
    } else if (denseState.view === "allowed") {
      appendJsonCard(
        container,
        "Claim Budget " + projection.allowed_claims.length + " / " + projection.claim_budget,
        "Allowed Claims",
        "supported",
        projection.allowed_claims,
        "Only these evidence-linked statements may be realized by the caption model."
      );
    } else if (denseState.view === "blocked") {
      appendJsonCard(
        container,
        "Explicit Uncertainty",
        "Blocked Claims",
        "ambiguous",
        projection.blocked_claims,
        "Unknown or uncalibrated concepts remain visible but cannot be verbalized as facts."
      );
    } else {
      appendJsonCard(
        container,
        "Complete Projection Artifact",
        projection.sample_id,
        "supported",
        projection,
        "This is a provider-neutral projection, not an assembled Gemini request."
      );
    }
  }

  function renderUnavailableStage(container, stage) {
    const messages = {
      llm_input: {
        text: "This sample has M.0.4 canonical evidence and a P.0.1 compact projection, but no assembled Gemini prompt, attachment manifest, or immutable request hash.",
        prerequisites: [
          "Choose the caption realization prompt version.",
          "Assemble the exact text prompt and optional MIDI or audio attachment manifest.",
          "Freeze an immutable request record before execution.",
        ],
      },
      raw_output: {
        text: "No Gemini request has been assembled or executed for this M.0.4/P.0.1 sample pair, so there is no linked verbatim response.",
        prerequisites: [
          "Assemble the J.0.1 exact LLM input from P.0.1.",
          "Execute either Gemini Web (A) or Gemini API (B).",
          "Store the raw response with its request hash and backend version.",
        ],
      },
      final_caption: {
        text: "No raw response exists for this sample, and evidence-aware caption filtering has not been run.",
        prerequisites: [
          "Record a raw Gemini output linked to the exact request.",
          "Apply LLM-based claim filtering against canonical evidence.",
          "Retain accepted, rejected, and uncertain claims for audit.",
        ],
      },
    };
    const content = messages[stage.id];
    const card = document.createElement("article");
    const label = document.createElement("p");
    const title = document.createElement("h4");
    const text = document.createElement("p");
    const rule = document.createElement("strong");
    const list = document.createElement("ol");
    card.className = "dense-empty-stage";
    label.className = "section-kicker";
    label.textContent = stage.version + " · Explicit Pipeline Boundary";
    title.textContent = stage.statusLabel;
    text.textContent = content.text;
    rule.textContent = "Required Before This Stage Can Contain Data";
    content.prerequisites.forEach(function (prerequisite) {
      const item = document.createElement("li");
      item.textContent = prerequisite;
      list.appendChild(item);
    });
    card.append(label, title, text, rule, list);
    container.appendChild(card);
  }

  function renderContent() {
    const container = get("[data-dense-content]");
    container.innerHTML = "";
    const sample = denseState.sample;
    const projection = denseState.projection;
    if (!sample || !projection) {
      const loading = document.createElement("p");
      loading.className = "dense-loading";
      loading.textContent = "Loading actual extractor output…";
      container.appendChild(loading);
      return;
    }
    if (denseState.stage === "source") renderSource(container, sample);
    else if (denseState.stage === "projection") renderProjection(container, projection);
    else if (denseState.stage !== "canonical") {
      renderUnavailableStage(container, currentStage());
    } else if (denseState.view === "global") renderGlobal(container, sample);
    else if (denseState.view === "local") renderLocal(container, sample);
    else if (denseState.view === "roles") renderTrackRoles(container, sample);
    else if (denseState.view === "timing") renderTiming(container, sample);
    else {
      appendJsonCard(
        container,
        "Complete Artifact",
        sample.sample_id,
        sample.quality.status,
        sample
      );
    }
  }

  function renderTabs() {
    const tabs = get("[data-dense-tabs]");
    tabs.innerHTML = "";
    tabs.hidden = !["canonical", "projection"].includes(denseState.stage);
    if (tabs.hidden) return;
    const views = denseState.stage === "canonical"
      ? [
          ["global", "Global"],
          ["local", "Local"],
          ["roles", "Track / Role"],
          ["timing", "Timing"],
          ["raw", "Raw JSON"],
        ]
      : [
          ["compact", "Compact Metadata"],
          ["allowed", "Allowed Claims"],
          ["blocked", "Blocked Claims"],
          ["projection_raw", "Raw JSON"],
        ];
    views.forEach(function (viewSpec) {
      const button = document.createElement("button");
      const active = denseState.view === viewSpec[0];
      button.type = "button";
      button.className = "dense-view-button" + (active ? " active" : "");
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(active));
      button.textContent = viewSpec[1];
      button.addEventListener("click", function () {
        denseState.view = viewSpec[0];
        renderTabs();
        renderContent();
      });
      tabs.appendChild(button);
    });
  }

  function renderSampleSummary() {
    const sample = denseState.sample;
    const localScope = sample.scopes.local;
    const localNotes = sample.metadata.local.notes;
    get("[data-dense-release]").textContent =
      denseState.index.release_id + " + " + denseState.index.projection_release_id +
      " · " + sample.selection.scale_bars + "-Bar Audit Span";
    get("[data-dense-sample-title]").textContent = formatLabel(sample.sample_id);
    get("[data-dense-sample-origin]").textContent =
      sample.source.source_id.toUpperCase() +
      ", selected deterministically from the actual POP909 Train split. " +
      "This canonical/projection pair is an audit artifact, not a training export.";
    get("[data-dense-source]").textContent = sample.source.source_id;
    get("[data-dense-split]").textContent = formatLabel(sample.source.split);
    get("[data-dense-scale]").textContent = localScope.bar_count + " Bars";
    get("[data-dense-seconds]").textContent =
      localScope.start_sec.toFixed(2) + "–" + localScope.end_sec.toFixed(2) + " Sec";
    get("[data-dense-bars]").textContent =
      localScope.start_bar + "–" + (localScope.end_bar_exclusive - 1);
    get("[data-dense-note-count]").textContent = localNotes.note_on_event_count;
  }

  async function loadSample() {
    const entry = currentEntry();
    if (!entry) return;
    const requestToken = denseState.requestToken + 1;
    denseState.requestToken = requestToken;
    denseState.sample = null;
    denseState.projection = null;
    renderPicker();
    renderContent();
    try {
      const canonicalHash = entry.record_sha256.slice(-12);
      const projectionHash = entry.projection_id.slice(-12);
      const responses = await Promise.all([
        fetch(
          "assets/data/dense-metadata/" + entry.canonical_file + "?v=" + canonicalHash,
          { cache: "no-store" }
        ),
        fetch(
          "assets/data/dense-metadata/" + entry.projection_file + "?v=" + projectionHash,
          { cache: "no-store" }
        ),
      ]);
      if (!responses[0].ok) throw new Error("Canonical HTTP " + responses[0].status);
      if (!responses[1].ok) throw new Error("Projection HTTP " + responses[1].status);
      const artifacts = await Promise.all(responses.map(function (response) {
        return response.json();
      }));
      if (requestToken !== denseState.requestToken) return;
      denseState.sample = artifacts[0];
      denseState.projection = artifacts[1];
      renderSampleSummary();
      renderStages();
      renderStageSummary();
      renderTabs();
      renderContent();
    } catch (error) {
      const message = document.createElement("p");
      message.className = "dense-loading";
      message.textContent = "Actual canonical/projection pair could not be loaded: " + error.message;
      const container = get("[data-dense-content]");
      container.innerHTML = "";
      container.appendChild(message);
    }
  }

  async function initializeDenseMetadata() {
    const container = get("[data-dense-feature-matrix]");
    if (!container) return;
    try {
      const response = await fetch(
        "assets/data/dense-metadata/index.json?release=m004-p001",
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Dense Metadata HTTP " + response.status);
      denseState.index = await response.json();
      renderMetrics();
      renderFeatureMatrix();
      renderPicker();
      renderStages();
      renderStageSummary();
      renderTabs();
      loadSample();
    } catch (error) {
      const message = document.createElement("p");
      message.className = "dense-loading";
      message.textContent = "Dense metadata audit unavailable: " + error.message;
      container.innerHTML = "";
      container.appendChild(message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDenseMetadata);
  } else {
    initializeDenseMetadata();
  }
}());
