const sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

const tokenizerRuntime = {
  tiktokenLite: null,
  gptEncodings: new Map(),
  hfModule: null,
  customTokenizer: null,
  customName: ""
};

const tokenizerProfiles = {
  "gpt-cl100k": {
    label: "GPT cl100k",
    status: "GPT-4 / GPT-3.5 tokenizer: cl100k_base via js-tiktoken.",
    encoding: "cl100k_base"
  },
  "gpt-o200k": {
    label: "GPT o200k",
    status: "GPT-4o tokenizer: o200k_base via js-tiktoken.",
    encoding: "o200k_base"
  },
  "llama-approx": {
    label: "Llama approx",
    status: "Approximate Llama chunks. Upload tokenizer.json for exact model tokens."
  },
  custom: {
    label: "Custom",
    status: "Upload a Hugging Face tokenizer.json to enable exact custom tokenization."
  },
  word: {
    label: "Words",
    status: "Word chunks are a visualization mode, not model tokens."
  },
  character: {
    label: "Chars",
    status: "Character chunks are a visualization mode, not model tokens."
  }
};

const els = {
  sourceText: document.querySelector("#sourceText"),
  loadSample: document.querySelector("#loadSample"),
  clearText: document.querySelector("#clearText"),
  charCount: document.querySelector("#charCount"),
  tokenPreviewMode: document.querySelector("#tokenPreviewMode"),
  tokenCount: document.querySelector("#tokenCount"),
  tokenChips: document.querySelector("#tokenChips"),
  generatedProfile: document.querySelector("#generatedProfile"),
  tokenizerStatus: document.querySelector("#tokenizerStatus"),
  tokenizerFile: document.querySelector("#tokenizerFile"),
  output: document.querySelector("#output"),
  tps: document.querySelector("#tps"),
  tpsStat: document.querySelector("#tpsStat"),
  sliderValue: document.querySelector("#sliderValue"),
  generatedCount: document.querySelector("#generatedCount"),
  totalTokens: document.querySelector("#totalTokens"),
  elapsed: document.querySelector("#elapsed"),
  status: document.querySelector("#status"),
  statusDot: document.querySelector("#statusDot"),
  tokenProfile: document.querySelector("#tokenProfile"),
  streamingMode: document.querySelector("#streamingMode"),
  instantMode: document.querySelector("#instantMode"),
  delayToggle: document.querySelector("#delayToggle"),
  delaySeconds: document.querySelector("#delaySeconds"),
  jitterButtons: document.querySelectorAll(".jitter"),
  start: document.querySelector("#start"),
  pause: document.querySelector("#pause"),
  reset: document.querySelector("#reset"),
  stop: document.querySelector("#stop")
};

const state = {
  tokenProfile: "gpt-cl100k",
  streamMode: "streaming",
  jitter: "medium",
  delayEnabled: true,
  status: "ready",
  tokens: [],
  index: 0,
  outputText: "",
  timerId: null,
  elapsedTimerId: null,
  startTime: 0,
  accumulatedMs: 0,
  previewRun: 0
};

function profileLabel() {
  if (state.tokenProfile === "custom" && tokenizerRuntime.customName) {
    return tokenizerRuntime.customName.replace(/\.json$/i, "");
  }
  return tokenizerProfiles[state.tokenProfile].label;
}

function setTokenizerStatus(message, tone = "normal") {
  const loadedName = message.match(/^(cl100k_base|o200k_base)\b/)?.[1]
    || message.match(/^([^ ]+\.json)\b/)?.[1]
    || profileLabel();
  els.tokenizerStatus.textContent = loadedName;
  els.tokenizerStatus.dataset.tone = tone;
}

function setTokenizerLabels() {
  const label = profileLabel();
  els.tokenPreviewMode.textContent = label;
  els.generatedProfile.textContent = label;
}

function renderTokenChips(tokens) {
  els.tokenChips.textContent = "";
  const previewTokens = tokens.slice(0, 22);

  for (const token of previewTokens) {
    const chip = document.createElement("span");
    chip.className = "token-chip";
    const raw = String(token);
    const hasLeadingSpace = /^\s/.test(raw);
    const visible = raw
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n")
      .trimStart();

    if (hasLeadingSpace) {
      chip.classList.add("leading-space");
      chip.title = "This token includes leading whitespace.";
    }

    if (!visible) {
      chip.classList.add("whitespace-token");
      chip.textContent = raw.includes("\n") ? "[newline]" : "[space]";
    } else {
      chip.textContent = visible;
    }
    els.tokenChips.appendChild(chip);
  }

  if (tokens.length > previewTokens.length) {
    const more = document.createElement("span");
    more.className = "token-chip more";
    more.textContent = "...";
    els.tokenChips.appendChild(more);
  }
}

function splitIntoSubwords(segment, targetSize) {
  if (!segment) return [];
  if (!/[A-Za-z0-9]/.test(segment)) return Array.from(segment);
  if (segment.length <= targetSize + 1) return [segment];

  const chunks = [];
  let index = 0;
  while (index < segment.length) {
    const remaining = segment.length - index;
    const size = remaining <= targetSize + 1 ? remaining : targetSize + (index % 2);
    chunks.push(segment.slice(index, index + size));
    index += size;
  }
  return chunks;
}

function approximateModelTokens(text, targetSize = 4) {
  const parts = text.match(/\s+|[A-Za-z0-9]+|[^A-Za-z0-9\s]+/g) || [];
  const tokens = [];
  let pendingSpace = "";

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      pendingSpace += part;
      continue;
    }

    const chunks = splitIntoSubwords(part, targetSize);
    if (chunks.length) {
      chunks[0] = pendingSpace + chunks[0];
      pendingSpace = "";
      tokens.push(...chunks);
    }
  }

  if (pendingSpace) tokens.push(pendingSpace);
  return tokens;
}

function chunksFromTokenCount(text, tokenCount) {
  if (!text || tokenCount <= 0) return [];
  const chars = Array.from(text);
  if (tokenCount >= chars.length) return chars;

  const chunks = [];
  let cursor = 0;
  for (let i = 0; i < tokenCount; i += 1) {
    const remainingChars = chars.length - cursor;
    const remainingTokens = tokenCount - i;
    const size = Math.max(1, Math.round(remainingChars / remainingTokens));
    chunks.push(chars.slice(cursor, cursor + size).join(""));
    cursor += size;
  }
  return chunks;
}

async function getGptEncoding(encodingName) {
  if (tokenizerRuntime.gptEncodings.has(encodingName)) {
    return tokenizerRuntime.gptEncodings.get(encodingName);
  }

  if (!tokenizerRuntime.tiktokenLite) {
    tokenizerRuntime.tiktokenLite = import("https://esm.sh/js-tiktoken@1.0.21/lite");
  }

  const [{ Tiktoken }, ranks] = await Promise.all([
    tokenizerRuntime.tiktokenLite,
    fetch(`https://tiktoken.pages.dev/js/${encodingName}.json`).then((response) => {
      if (!response.ok) throw new Error(`Could not load ${encodingName} ranks`);
      return response.json();
    })
  ]);
  const encoding = new Tiktoken(ranks);
  tokenizerRuntime.gptEncodings.set(encodingName, encoding);
  return encoding;
}

function decodedChunksFromIds(tokenizer, ids, originalText) {
  const chunks = ids.map((id) => tokenizer.decode([Number(id)]));
  const joined = chunks.join("");
  if (joined === originalText) return chunks;
  return chunksFromTokenCount(originalText, ids.length);
}

async function tokenizeWithGpt(text, encodingName) {
  try {
    const encoding = await getGptEncoding(encodingName);
    const ids = Array.from(encoding.encode(text));
    setTokenizerStatus(`${encodingName} loaded. Counts are exact; stream chunks follow the token count.`, "ok");
    return decodedChunksFromIds(encoding, ids, text);
  } catch (error) {
    setTokenizerStatus(`${encodingName} could not load, using approximate chunks.`, "warn");
    return approximateModelTokens(text, encodingName === "o200k_base" ? 4 : 4);
  }
}

async function tokenizeWithCustom(text) {
  if (!tokenizerRuntime.customTokenizer) {
    setTokenizerStatus("Upload tokenizer.json before using the custom tokenizer profile.", "warn");
    return [];
  }

  try {
    const ids = Array.from(tokenizerRuntime.customTokenizer.encode(text, { add_special_tokens: false }));
    const chunks = ids.map((id) => tokenizerRuntime.customTokenizer.decode([Number(id)], { skip_special_tokens: false }));
    const joined = chunks.join("");
    setTokenizerStatus(`${profileLabel()} loaded. Counts come from the uploaded tokenizer.json.`, "ok");
    return joined === text ? chunks : chunksFromTokenCount(text, ids.length);
  } catch (error) {
    setTokenizerStatus("Uploaded tokenizer failed to encode this text.", "warn");
    return [];
  }
}

async function tokenize(text) {
  if (state.tokenProfile === "character") return Array.from(text);
  if (state.tokenProfile === "word") return text.match(/\S+\s*|\s+/g) || [];
  if (state.tokenProfile === "llama-approx") return approximateModelTokens(text, 3);
  if (state.tokenProfile === "custom") return tokenizeWithCustom(text);

  const profile = tokenizerProfiles[state.tokenProfile];
  return tokenizeWithGpt(text, profile.encoding);
}

async function refreshTokenPreview({ reset = false } = {}) {
  const previewRun = ++state.previewRun;
  const text = els.sourceText.value;
  setTokenizerLabels();
  if (tokenizerProfiles[state.tokenProfile]) {
    setTokenizerStatus(tokenizerProfiles[state.tokenProfile].status);
  }

  const tokens = await tokenize(text);
  if (previewRun !== state.previewRun) return;

  els.charCount.textContent = Array.from(text).length.toLocaleString();
  els.tokenCount.textContent = tokens.length.toLocaleString();
  els.totalTokens.textContent = tokens.length.toLocaleString();
  renderTokenChips(tokens);

  if (reset || ["ready", "completed", "stopped"].includes(state.status)) {
    state.tokens = tokens;
    state.index = reset ? 0 : Math.min(state.index, tokens.length);
    if (reset) state.outputText = "";
    updateGenerated();
    renderOutput();
  }
}

function setStatus(status) {
  state.status = status;
  const labels = {
    ready: "Ready",
    thinking: "Thinking",
    streaming: "Streaming",
    paused: "Paused",
    completed: "Completed",
    stopped: "Stopped"
  };
  const colors = {
    ready: "#57a6ff",
    thinking: "#e0b41d",
    streaming: "#28d17c",
    paused: "#e0b41d",
    completed: "#76ed99",
    stopped: "#ef4444"
  };
  els.status.textContent = labels[status];
  els.statusDot.style.background = colors[status];
  els.statusDot.style.boxShadow = `0 0 18px ${colors[status]}99`;
}

function setActive(buttons, activeButton) {
  buttons.forEach((button) => button.classList.toggle("active", button === activeButton));
}

function renderOutput() {
  els.output.textContent = "";
  if (state.status === "thinking") {
    const thinking = document.createElement("span");
    thinking.className = "thinking";
    thinking.append("Thinking");
    for (let i = 0; i < 3; i += 1) {
      thinking.appendChild(document.createElement("i"));
    }
    els.output.appendChild(thinking);
    return;
  }

  if (!state.outputText && state.status === "ready") {
    const placeholder = document.createElement("span");
    placeholder.className = "placeholder";
    placeholder.textContent = "Ready to stream. Press Start to begin.";
    els.output.appendChild(placeholder);
    return;
  }

  if (!state.outputText && state.status === "stopped") {
    const placeholder = document.createElement("span");
    placeholder.className = "placeholder";
    placeholder.textContent = "Stopped. Press Start to begin again.";
    els.output.appendChild(placeholder);
    return;
  }

  els.output.append(document.createTextNode(state.outputText));
  if (["streaming", "thinking", "paused"].includes(state.status)) {
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    els.output.appendChild(cursor);
  }
}

function updateGenerated() {
  if (state.index > state.tokens.length) state.index = state.tokens.length;
  els.generatedCount.textContent = state.index.toLocaleString();
  els.totalTokens.textContent = state.tokens.length.toLocaleString();
}

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function currentElapsedMs() {
  if (state.startTime) return state.accumulatedMs + performance.now() - state.startTime;
  return state.accumulatedMs;
}

function updateElapsed() {
  els.elapsed.textContent = formatMs(currentElapsedMs());
}

function beginElapsedTimer() {
  if (!state.startTime) state.startTime = performance.now();
  clearInterval(state.elapsedTimerId);
  state.elapsedTimerId = setInterval(updateElapsed, 50);
}

function pauseElapsedTimer() {
  if (state.startTime) {
    state.accumulatedMs += performance.now() - state.startTime;
    state.startTime = 0;
  }
  clearInterval(state.elapsedTimerId);
  updateElapsed();
}

function clearStreamTimer() {
  clearTimeout(state.timerId);
  state.timerId = null;
}

async function prepareTokens({ restart = false } = {}) {
  const text = els.sourceText.value;
  state.tokens = await tokenize(text);
  els.charCount.textContent = Array.from(text).length.toLocaleString();
  els.tokenCount.textContent = state.tokens.length.toLocaleString();
  setTokenizerLabels();
  renderTokenChips(state.tokens);
  if (restart || state.index >= state.tokens.length || state.outputText === "") {
    state.index = 0;
    state.outputText = "";
    state.accumulatedMs = 0;
    state.startTime = 0;
    updateElapsed();
  }
  updateGenerated();
}

function finishStream() {
  clearStreamTimer();
  pauseElapsedTimer();
  state.index = state.tokens.length;
  setStatus("completed");
  updateGenerated();
  renderOutput();
}

function appendBurst() {
  const tps = Number(els.tps.value);
  let burstSize = 1;
  if (state.streamMode === "streaming") {
    const burstChance = state.jitter === "high" ? 0.32 : state.jitter === "medium" ? 0.2 : 0.08;
    if (Math.random() < burstChance) {
      burstSize = Math.min(state.jitter === "high" ? 5 : 3, 1 + Math.floor(Math.random() * 4));
    }
    if (tps >= 70 && Math.random() < 0.3) burstSize += 1;
  }

  const remaining = state.tokens.length - state.index;
  const count = Math.max(1, Math.min(burstSize, remaining));
  state.outputText += state.tokens.slice(state.index, state.index + count).join("");
  state.index += count;
  updateGenerated();
  renderOutput();
  if (state.index >= state.tokens.length) finishStream();
}

function nextDelayMs() {
  const base = 1000 / Number(els.tps.value);
  if (state.streamMode === "instant") {
    return Math.max(4, base);
  }
  const profiles = {
    low: { min: 0.88, max: 1.16, pause: 0.02, pauseMax: 90 },
    medium: { min: 0.68, max: 1.52, pause: 0.06, pauseMax: 190 },
    high: { min: 0.42, max: 2.15, pause: 0.11, pauseMax: 380 }
  };
  const profile = profiles[state.jitter];
  const factor = profile.min + Math.random() * (profile.max - profile.min);
  const pause = Math.random() < profile.pause ? Math.random() * profile.pauseMax : 0;
  return Math.max(4, base * factor + pause);
}

function scheduleNext() {
  clearStreamTimer();
  if (state.status !== "streaming") return;
  state.timerId = setTimeout(() => {
    if (state.status !== "streaming") return;
    appendBurst();
    if (state.index < state.tokens.length) scheduleNext();
  }, nextDelayMs());
}

async function startStream({ restart = false } = {}) {
  clearStreamTimer();
  await prepareTokens({ restart });
  if (!state.tokens.length) {
    setStatus("ready");
    renderOutput();
    return;
  }

  const beginStreaming = () => {
    if (state.status !== "thinking" && state.status !== "streaming") return;
    setStatus("streaming");
    beginElapsedTimer();
    renderOutput();
    scheduleNext();
  };

  if (restart || state.index === 0) {
    state.outputText = "";
    updateGenerated();
  }

  if (state.delayEnabled && state.index === 0) {
    setStatus("thinking");
    renderOutput();
    state.timerId = setTimeout(beginStreaming, Number(els.delaySeconds.value) * 1000);
  } else {
    setStatus("streaming");
    beginElapsedTimer();
    renderOutput();
    scheduleNext();
  }
}

function pauseStream() {
  if (state.status !== "streaming" && state.status !== "thinking") return;
  clearStreamTimer();
  pauseElapsedTimer();
  setStatus("paused");
  renderOutput();
}

async function resetStream({ restartIfActive = true } = {}) {
  const shouldRestart = restartIfActive && (state.status === "streaming" || state.status === "thinking");
  clearStreamTimer();
  pauseElapsedTimer();
  state.index = 0;
  state.outputText = "";
  state.accumulatedMs = 0;
  state.startTime = 0;
  updateElapsed();
  setStatus("ready");
  await prepareTokens({ restart: true });
  renderOutput();
  if (shouldRestart) await startStream({ restart: true });
}

function stopStream() {
  clearStreamTimer();
  pauseElapsedTimer();
  state.index = 0;
  state.outputText = "";
  updateGenerated();
  setStatus("stopped");
  renderOutput();
}

function persistInput() {
  localStorage.setItem("streaming-simulator-text", els.sourceText.value);
}

async function handleTokenizerUpload(event) {
  const [file] = Array.from(event.target.files || []);
  if (!file) return;

  setTokenizerStatus(`Loading ${file.name} locally...`);
  try {
    const tokenizerJSON = JSON.parse(await file.text());
    if (!tokenizerRuntime.hfModule) {
      tokenizerRuntime.hfModule = import("https://esm.sh/@huggingface/transformers@3.8.1");
    }
    const { PreTrainedTokenizer } = await tokenizerRuntime.hfModule;
    const tokenizer = new PreTrainedTokenizer(tokenizerJSON, {});
    tokenizer.encode("tokenizer test", { add_special_tokens: false });
    tokenizerRuntime.customTokenizer = tokenizer;
    tokenizerRuntime.customName = file.name;
    state.tokenProfile = "custom";
    els.tokenProfile.value = "custom";
    setTokenizerLabels();
    await resetStream({ restartIfActive: false });
    setTokenizerStatus(`${file.name} loaded. Custom token counts now use the uploaded tokenizer.`, "ok");
  } catch (error) {
    tokenizerRuntime.customTokenizer = null;
    tokenizerRuntime.customName = "";
    setTokenizerStatus("Could not load that tokenizer.json. It may need a different tokenizer runtime.", "warn");
  } finally {
    event.target.value = "";
  }
}

els.sourceText.addEventListener("input", () => {
  persistInput();
  void refreshTokenPreview({ reset: ["ready", "completed", "stopped"].includes(state.status) });
});

els.loadSample.addEventListener("click", () => {
  els.sourceText.value = sampleText;
  persistInput();
  void refreshTokenPreview({ reset: true });
});

els.clearText.addEventListener("click", () => {
  els.sourceText.value = "";
  persistInput();
  void refreshTokenPreview({ reset: true });
});

els.tps.addEventListener("input", () => {
  els.tpsStat.textContent = els.tps.value;
  els.sliderValue.textContent = els.tps.value;
});

els.tokenProfile.addEventListener("change", async () => {
  state.tokenProfile = els.tokenProfile.value;
  setTokenizerLabels();
  await resetStream({ restartIfActive: false });
});

els.tokenizerFile.addEventListener("change", (event) => {
  void handleTokenizerUpload(event);
});

els.streamingMode.addEventListener("click", () => {
  state.streamMode = "streaming";
  setActive([els.streamingMode, els.instantMode], els.streamingMode);
});

els.instantMode.addEventListener("click", () => {
  state.streamMode = "instant";
  setActive([els.streamingMode, els.instantMode], els.instantMode);
});

els.delayToggle.addEventListener("click", () => {
  state.delayEnabled = !state.delayEnabled;
  els.delayToggle.setAttribute("aria-pressed", String(state.delayEnabled));
  els.delayToggle.textContent = state.delayEnabled ? "On" : "Off";
});

els.jitterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.jitter = button.dataset.jitter;
    setActive(Array.from(els.jitterButtons), button);
  });
});

els.start.addEventListener("click", () => {
  const restart = state.status === "completed" || state.status === "stopped";
  void startStream({ restart });
});

els.pause.addEventListener("click", pauseStream);
els.reset.addEventListener("click", () => {
  void resetStream();
});
els.stop.addEventListener("click", stopStream);

els.sourceText.value = localStorage.getItem("streaming-simulator-text") || sampleText;
els.tpsStat.textContent = els.tps.value;
els.sliderValue.textContent = els.tps.value;
setStatus("ready");
setTokenizerLabels();
void refreshTokenPreview({ reset: true });
renderOutput();
