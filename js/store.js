// Sparar inställningar, historik och träning i telefonen (inget skickas till någon server).
const KEY = 'golfswing.v1';
const MAX_HISTORY = 60;

const state = Object.assign({ level: null, history: [], trained: {} }, read());

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

function save() {
  for (;;) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return;
    } catch {
      if (state.history.length <= 1) return; // fullt: släng de äldsta svingarna och försök igen
      state.history = state.history.slice(0, Math.floor(state.history.length / 2));
    }
  }
}

const today = () => new Date().toISOString().slice(0, 10);

export const store = {
  get level() { return state.level; },
  setLevel(level) { state.level = level; save(); },

  get history() { return state.history; },
  addResult(entry) {
    state.history.unshift(entry);
    state.history = state.history.slice(0, MAX_HISTORY);
    save();
  },
  clearHistory() { state.history = []; save(); },

  isDoneToday(drill) { return (state.trained[today()] || []).includes(drill); },
  toggleDone(drill) {
    const day = state.trained[today()] || [];
    state.trained[today()] = day.includes(drill) ? day.filter(d => d !== drill) : [...day, drill];
    if (!state.trained[today()].length) delete state.trained[today()];
    save();
  },
  // Antal dagar med träning de senaste 7 dagarna
  daysTrainedThisWeek() {
    const limit = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    return Object.keys(state.trained).filter(d => d >= limit).length;
  },
};
