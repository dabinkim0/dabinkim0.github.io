(function () {
  "use strict";

  const denseState = {
    index: null,
    sample: null,
    sampleIndex: 0,
    scale: "all",
    view: "overview",
    requestToken: 0,
  };

  function get(selector) {
    return document.querySelector(selector);
  }

  function formatLabel(value) {
    return String(value || "—")
      .replaceAll("_", " ")
      .replace(/w/g, function (letter) { return letter.toUpperCase(); });
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
    get("[data-dense-sample-count]").textContent = denseState.index.sample_count;
    get("[data-dense-implemented-count]").textContent = counts.implemented || 0;
    get("[data-dense-partial-count]").textContent = counts.partial || 0;
    get("[data-dense-missing-count]").textContent = counts.not_implemented || 0;
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
    sampleTitle.textContent = "Select An Actual Train Metadata Example";
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

  function renderStatusOverview(container, sample) {
    const statusGrid = document.createElement("div");
    statusGrid.className = "dense-sample-status-grid";
    Object.entries(sample.feature_status).forEach(function (entry) {
      const featureId = entry[0];
      const feature = entry[1];
      const row = document.createElement("article");
      const heading = document.createElement("div");
      const title = document.createElement("strong");
      const code = document.createElement("code");
      title.textContent = formatLabel(featureId.split(".").slice(-1)[0]);
      code.textContent = featureId;
      heading.append(title, code);
      const badges = document.createElement("div");
      badges.append(
        statusBadge(formatLabel(feature.implementation_status), feature.implementation_status),
        statusBadge(formatLabel(feature.evidence_status), feature.evidence_status)
      );
      const method = document.createElement("p");
      method.textContent = feature.reason
        ? feature.method + " · " + formatLabel(feature.reason)
        : feature.method;
      row.append(heading, badges, method);
      statusGrid.appendChild(row);
    });
    container.appendChild(statusGrid);
    appendJsonCard(
      container,
      "Observed Scope",
      "Coordinate And Selection Contract",
      "supported",
      { scope: sample.scope, selection: sample.selection }
    );
    appendJsonCard(
      container,
      "Source Provenance",
      "Actual POP909 Train Input",
      "supported",
      sample.source
    );
    appendJsonCard(
      container,
      "Explicit Boundary",
      "Not Implemented In This Release",
      "not_implemented",
      sample.not_implemented,
      "Unavailable fields are not populated with illustrative or LLM-generated values."
    );
  }

  function renderNotes(container, sample) {
    Object.entries(sample.metadata.notes.role_summaries).forEach(function (entry) {
      appendJsonCard(
        container,
        "Role-Aware Note Evidence",
        entry[0],
        entry[1].status,
        entry[1]
      );
    });
    appendJsonCard(
      container,
      "Exact Event Layer",
      sample.metadata.notes.events.length + " Onset Events",
      "supported",
      sample.metadata.notes.events,
      "Every event is directly paired from the source MIDI. Long-span tables are scrollable."
    );
  }

  function renderRhythm(container, sample) {
    Object.entries(sample.metadata.rhythm.role_sequences).forEach(function (entry) {
      appendJsonCard(
        container,
        "Exact Beat-Normalized Sequence",
        entry[0],
        "supported",
        entry[1]
      );
    });
  }

  function makeSparkline(label, values, color) {
    const numeric = values.filter(function (value) { return Number.isFinite(value); });
    const card = document.createElement("article");
    const title = document.createElement("span");
    title.textContent = label;
    card.appendChild(title);
    if (!numeric.length) {
      const unavailable = document.createElement("strong");
      unavailable.textContent = "Unavailable";
      card.appendChild(unavailable);
      return card;
    }
    const minimum = Math.min.apply(null, numeric);
    const maximum = Math.max.apply(null, numeric);
    const range = Math.max(1e-9, maximum - minimum);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 42");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    const points = numeric.map(function (value, index) {
      const x = numeric.length === 1 ? 50 : index / (numeric.length - 1) * 100;
      const y = 36 - (value - minimum) / range * 30;
      return x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
    polyline.setAttribute("points", points);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", color);
    polyline.setAttribute("stroke-width", "2");
    polyline.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(polyline);
    const rangeText = document.createElement("small");
    rangeText.textContent = minimum.toFixed(2) + "–" + maximum.toFixed(2);
    card.append(svg, rangeText);
    return card;
  }

  function renderTexture(container, sample) {
    const trajectory = sample.metadata.texture.bar_trajectory;
    const charts = document.createElement("div");
    charts.className = "dense-trajectory-charts";
    charts.append(
      makeSparkline(
        "Onsets Per Beat",
        trajectory.map(function (bar) { return bar.onsets_per_beat; }),
        "#3769a8"
      ),
      makeSparkline(
        "Mean Polyphony",
        trajectory.map(function (bar) { return bar.polyphony.duration_weighted_mean; }),
        "#7b5aa6"
      ),
      makeSparkline(
        "Median Velocity",
        trajectory.map(function (bar) {
          return bar.velocity_summary ? bar.velocity_summary.median : null;
        }),
        "#c79536"
      )
    );
    container.appendChild(charts);

    const tableWrap = document.createElement("div");
    tableWrap.className = "dense-table-wrap";
    const table = document.createElement("table");
    const header = document.createElement("thead");
    header.innerHTML =
      "<tr><th>Bar</th><th>Seconds</th><th>Onsets / Beat</th>" +
      "<th>Mean Polyphony</th><th>Max Polyphony</th>" +
      "<th>Median Velocity</th><th>CC64</th></tr>";
    const body = document.createElement("tbody");
    trajectory.forEach(function (bar) {
      const row = document.createElement("tr");
      const values = [
        bar.bar_index,
        bar.start_sec.toFixed(2) + "–" + bar.end_sec.toFixed(2),
        bar.onsets_per_beat,
        bar.polyphony.duration_weighted_mean,
        bar.polyphony.maximum,
        bar.velocity_summary ? bar.velocity_summary.median : "Unknown",
        bar.pedal_cc64.occupancy_ratio === null
          ? "Unknown"
          : bar.pedal_cc64.occupancy_ratio,
      ];
      values.forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
    table.append(header, body);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);
    appendJsonCard(
      container,
      "Deterministic Aggregate",
      "Span Texture Summary",
      "supported",
      {
        span_polyphony: sample.metadata.texture.span_polyphony,
        role_onset_counts: sample.metadata.texture.role_onset_counts,
      }
    );
  }

  function renderContent() {
    const container = get("[data-dense-content]");
    container.innerHTML = "";
    const sample = denseState.sample;
    if (!sample) {
      const loading = document.createElement("p");
      loading.className = "dense-loading";
      loading.textContent = "Loading actual extractor output…";
      container.appendChild(loading);
      return;
    }
    if (denseState.view === "overview") renderStatusOverview(container, sample);
    else if (denseState.view === "notes") renderNotes(container, sample);
    else if (denseState.view === "rhythm") renderRhythm(container, sample);
    else if (denseState.view === "texture") renderTexture(container, sample);
    else if (denseState.view === "tonality") {
      appendJsonCard(
        container,
        "Dataset Annotation",
        "Local Key",
        sample.metadata.tonality_harmony.local_key_annotation.status,
        sample.metadata.tonality_harmony.local_key_annotation,
        "This key annotation is audio-derived, not a MIDI-only rule estimate."
      );
      appendJsonCard(
        container,
        "Dataset Annotation",
        "Chord Timeline",
        sample.metadata.tonality_harmony.chord_timeline.status,
        sample.metadata.tonality_harmony.chord_timeline
      );
    } else if (denseState.view === "performance") {
      appendJsonCard(
        container,
        "Direct MIDI Evidence",
        "Velocity",
        sample.metadata.dynamics.status,
        sample.metadata.dynamics,
        "MIDI velocity is not converted into acoustic loudness wording."
      );
      appendJsonCard(
        container,
        "Conditional MIDI Evidence",
        "Sustain Pedal CC64",
        sample.metadata.performance.pedal_cc64.status,
        sample.metadata.performance.pedal_cc64,
        "Missing CC64 is insufficient evidence, not evidence that no pedal was used."
      );
    } else {
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
    const views = [
      ["overview", "Overview"],
      ["notes", "Notes And Roles"],
      ["rhythm", "Rhythm"],
      ["texture", "Texture"],
      ["tonality", "Tonality And Harmony"],
      ["performance", "Performance"],
      ["raw", "Raw JSON"],
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
    get("[data-dense-release]").textContent =
      denseState.index.release_id + " · " + sample.selection.scale_bars + "-Bar Audit Span";
    get("[data-dense-sample-title]").textContent = formatLabel(sample.sample_id);
    get("[data-dense-sample-origin]").textContent =
      sample.source.source_id.toUpperCase() +
      ", selected deterministically from the actual POP909 Train split. " +
      "This record is an extractor audit artifact, not a training export.";
    get("[data-dense-source]").textContent = sample.source.source_id;
    get("[data-dense-split]").textContent = formatLabel(sample.source.split);
    get("[data-dense-scale]").textContent = sample.scope.bar_count + " Bars";
    get("[data-dense-seconds]").textContent =
      sample.scope.start_sec.toFixed(2) + "–" + sample.scope.end_sec.toFixed(2) + " Sec";
    get("[data-dense-bars]").textContent =
      sample.scope.start_bar + "–" + (sample.scope.end_bar_exclusive - 1);
    get("[data-dense-note-count]").textContent = sample.metadata.notes.onset_event_count;
  }

  async function loadSample() {
    const entry = currentEntry();
    if (!entry) return;
    const requestToken = denseState.requestToken + 1;
    denseState.requestToken = requestToken;
    denseState.sample = null;
    renderPicker();
    renderContent();
    try {
      const shortHash = entry.record_sha256.slice(-12);
      const response = await fetch(
        "assets/data/dense-metadata/" + entry.file + "?v=" + shortHash,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Dense Sample HTTP " + response.status);
      const sample = await response.json();
      if (requestToken !== denseState.requestToken) return;
      denseState.sample = sample;
      renderSampleSummary();
      renderTabs();
      renderContent();
    } catch (error) {
      const message = document.createElement("p");
      message.className = "dense-loading";
      message.textContent = "Actual metadata could not be loaded: " + error.message;
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
        "assets/data/dense-metadata/index.json?release=m001",
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Dense Metadata HTTP " + response.status);
      denseState.index = await response.json();
      renderMetrics();
      renderFeatureMatrix();
      renderPicker();
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
