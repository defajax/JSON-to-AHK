import { DEFAULT_KEY_MAP } from "./keyMap.js";

function pythonRound(value) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

export function convertJsonToAhk(jsonText, keyMap, pressTimeInput, timeRatioInput) {
  let events;
  try {
    events = JSON.parse(jsonText);
  } catch {
    throw new Error("Invalid JSON. Check quotes, commas, and brackets.");
  }

  if (!Array.isArray(events)) {
    throw new Error("Expected a JSON array of events.");
  }

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
      throw new Error("Element " + (index + 1) + " must be an object with time and key fields.");
    }
    if (typeof event.time !== "number" || !Number.isFinite(event.time)) {
      throw new Error("In element " + (index + 1) + " the time field must be a finite number.");
    }
    if (typeof event.key !== "string") {
      throw new Error("In element " + (index + 1) + " the key field must be a string.");
    }
  }

  if (String(pressTimeInput).trim() === "") {
    throw new Error("Please specify the press duration.");
  }
  if (String(timeRatioInput).trim() === "") {
    throw new Error("Please specify the time divider.");
  }

  const pressTime = Number(pressTimeInput);
  const timeRatio = Number(timeRatioInput);
  if (!Number.isSafeInteger(pressTime) || pressTime < 0) {
    throw new Error("The press duration must be a whole number from 0.");
  }
  if (!Number.isFinite(timeRatio) || timeRatio <= 0) {
    throw new Error("The time divider must be a number greater than zero.");
  }

  for (const [key] of Object.entries(DEFAULT_KEY_MAP)) {
    if (typeof keyMap[key] !== "string" || keyMap[key].trim() === "") {
      throw new Error("Please fill in the mapping for " + key + ".");
    }
  }

  const grouped = new Map();
  for (const event of events) {
    const key = Object.prototype.hasOwnProperty.call(keyMap, event.key)
      ? keyMap[event.key].trim()
      : event.key;
    if (!grouped.has(event.time)) grouped.set(event.time, []);
    grouped.get(event.time).push(key);
  }

  const timestamps = Array.from(grouped.keys()).sort((a, b) => a - b);
  const lines = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const time = timestamps[index];
    const keys = grouped.get(time);
    const down = keys.map((key) => "{" + key + " down}").join("");
    const up = keys.map((key) => "{" + key + " up}").join("");

    lines.push('Send("' + down + '")');
    lines.push("Sleep(" + pressTime + ")");
    lines.push('Send("' + up + '")');

    if (index < timestamps.length - 1) {
      const delta = timestamps[index + 1] - time;
      const totalDuration = pythonRound(delta / timeRatio);
      if (!Number.isSafeInteger(totalDuration)) {
        throw new Error("The interval between events is too large.");
      }
      lines.push("Sleep(" + Math.max(50, totalDuration - pressTime) + ")");
    }
  }

  return {
    code: lines.join("\n"),
    eventCount: events.length,
    timestampCount: timestamps.length,
  };
}
