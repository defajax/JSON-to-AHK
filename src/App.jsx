import { useEffect, useState } from "react";
import { convertJsonToAhk } from "./converter.js";
import { EXAMPLES } from "./examples.js";
import { DEFAULT_KEY_MAP } from "./keyMap.js";

const STORAGE_KEY = "json-to-ahk-key-map";
const KEY_NAMES = Object.keys(DEFAULT_KEY_MAP);

function readSavedKeyMap() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_KEY_MAP };
    return Object.fromEntries(
      KEY_NAMES.map((key) => [
        key,
        typeof saved[key] === "string" ? saved[key] : DEFAULT_KEY_MAP[key],
      ]),
    );
  } catch {
    return { ...DEFAULT_KEY_MAP };
  }
}

function App() {
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  const [keyMap, setKeyMap] = useState(readSavedKeyMap);
  const [pressTime, setPressTime] = useState("100");
  const [timeRatio, setTimeRatio] = useState("1.71");
  const [status, setStatus] = useState({
    message: "Insert JSON and click Convert to get AutoHotkey code.",
    kind: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keyMap));
    } catch {
      // The converter still works when browser storage is unavailable.
    }
  }, [keyMap]);

  function updateStatus(message, kind = "") {
    setStatus({ message, kind });
  }

  function convert(text = source) {
    try {
      const converted = convertJsonToAhk(text, keyMap, pressTime, timeRatio);
      setResult(converted.code);
      if (converted.eventCount === 0) {
        updateStatus("Array is empty — add press events.");
      } else {
        updateStatus(
          "Ready: events — " + converted.eventCount + ", timestamps — " + converted.timestampCount + ".",
          "success",
        );
      }
    } catch (error) {
      setResult("");
      updateStatus(error.message || "Failed to convert data.", "error");
    }
  }

  function chooseExample(example) {
    if (!example.events.length) {
      updateStatus("Fill the array of this example in the src/examples.js file.", "error");
      return;
    }
    const json = JSON.stringify(example.events, null, 2);
    setSource(json);
    convert(json);
  }

  async function openJsonFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = await file.text();
      setSource(json);
      convert(json);
    } catch {
      updateStatus("Failed to read the selected file.", "error");
    } finally {
      event.target.value = "";
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      updateStatus("Code copied to clipboard.", "success");
    } catch {
      updateStatus("Copying is not available. Select the code and copy it manually.");
    }
  }

  function downloadResult() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result + "\n"], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "piano.ahk";
    link.click();
    URL.revokeObjectURL(url);
    updateStatus("File piano.ahk downloaded.", "success");
  }

  function resetKeyMap() {
    setKeyMap({ ...DEFAULT_KEY_MAP });
    updateStatus("Default key mapping restored.", "success");
  }

  const lineCount = result ? result.split("\n").length : 0;
  const lineLabel = lineCount === 1 ? "string" : lineCount >= 2 && lineCount <= 4 ? "strings" : "strings";

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Go to main page">
          <span className="brand-mark" aria-hidden="true">♫</span>
          <span>Converter <span className="brand-subtitle">/ tools</span></span>
        </a>
        <span className="top-note">Local processing · data is not sent to the server</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <div className="eyebrow">For virtual instruments in video games (Sky children of the light, Genshin Impact)</div>
        <h1 id="page-title">From JSON —<br /><span>to AutoHotkey.</span></h1>
        <p>Insert a sequence of key presses from the game - get a ready-to-use script for playing melodies. Suitable for Sky, Genshin Impact and other games.</p>
      </section>

      <section className="workspace" aria-label="Conversion of JSON to AutoHotkey">
        <article className="panel">
          <div className="panel-head">
            <div className="panel-title"><span className="step">01</span> Source Data</div>
            <label className="text-button file-button">
              ↥ <span>Open File</span>
              <input type="file" accept=".json,application/json" onChange={openJsonFile} />
            </label>
          </div>
          <label className="visually-hidden" htmlFor="source">JSON array of key presses</label>
          <textarea
            id="source"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck="false"
            placeholder={'[\n  { "time": 0, "key": "Key0" },\n  { "time": 500, "key": "Key1" }\n]'}
          />
          <div className="editor-foot">
            <span className="format">JSON · array of events</span>
            <button className="quiet-button" type="button" onClick={() => {
              setSource("");
              setResult("");
              updateStatus("Field cleared.");
            }}>Clear</button>
          </div>
          <div className="examples">
            <span className="section-kicker">EXAMPLES</span>
            <div className="example-buttons">
              {EXAMPLES.map((example) => (
                <button
                  className="secondary-button"
                  key={example.id}
                  type="button"
                  onClick={() => chooseExample(example)}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings">
            <span className="settings-label">Parameters</span>
            <label className="setting">Press Duration, ms
              <input type="number" min="0" step="1" value={pressTime} onChange={(event) => setPressTime(event.target.value)} />
            </label>
            <label className="setting">Time Divider
              <input type="number" min="0.001" step="0.01" value={timeRatio} onChange={(event) => setTimeRatio(event.target.value)} />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div className="panel-title"><span className="step">02</span> AutoHotkey Code</div>
            <div className="panel-tools">
              <button className="icon-button" type="button" onClick={copyResult} disabled={!result} aria-label="Скопировать код" title="Скопировать">⧉</button>
              <button className="icon-button" type="button" onClick={downloadResult} disabled={!result} aria-label="Скачать файл AHK" title="Скачать .ahk">↓</button>
            </div>
          </div>
          <label className="visually-hidden" htmlFor="result">Generated AutoHotkey code</label>
          <textarea id="result" className="result" value={result} readOnly spellCheck="false" placeholder="Here the generated code will appear..." />
          <div className="editor-foot">
            <span className="format">AutoHotkey v2</span>
            <span className="format">{lineCount} {lineLabel}</span>
          </div>
        </article>
      </section>

      <section className="mapping-panel panel" aria-labelledby="mapping-title">
        <div className="panel-head mapping-head">
          <div>
            <div className="panel-title" id="mapping-title"><span className="step">03</span> Key Mapping</div>
            <p className="panel-description">Configure which AutoHotkey key will be pressed for each Key.</p>
          </div>
          <button className="secondary-button" type="button" onClick={resetKeyMap}>Reset to Defaults</button>
        </div>
        <div className="mapping-grid">
          {KEY_NAMES.map((key) => (
            <label className="mapping-item" key={key}>
              <span>{key}</span>
              <input
                type="text"
                value={keyMap[key]}
                onChange={(event) => setKeyMap((current) => ({ ...current, [key]: event.target.value }))}
                aria-label={"AutoHotkey key for " + key}
                maxLength="16"
              />
            </label>
          ))}
        </div>
        <div className="mapping-note">Changes are saved in this browser. You can specify a letter or the name of an AutoHotkey key.</div>
      </section>

      <div className="convert-row">
        <div className={"status " + status.kind} role="status" aria-live="polite">{status.message}</div>
        <button className="primary-button" type="button" onClick={() => convert()}>
          Convert <span aria-hidden="true">→</span>
        </button>
      </div>

      <aside className="hint">
        <span className="hint-mark" aria-hidden="true">✳</span>
        <span><strong>JSON Format:</strong> each array element must contain a numeric <code>time</code> field and a string <code>key</code> field. Keys Key0–Key14 can be remapped above.</span>
      </aside>

      <footer className="footer">
        <span>JSON → AutoHotkey</span>
        <span>React + Vite</span>
      </footer>
    </main>
  );
}

export default App;
