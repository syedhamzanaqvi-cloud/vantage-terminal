import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "data.json");

const DEFAULT_STATE = {
  balance: 1000000, // PKR demo balance
  positions: [],
  closedTrades: [],
};

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read data.json, starting fresh:", e.message);
  }
  return { ...DEFAULT_STATE };
}

let state = load();

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

export function getState() {
  return state;
}

export function setState(next) {
  state = next;
  save();
}
