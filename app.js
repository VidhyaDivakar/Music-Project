const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];
let isRecording = false, isPaused = false, recStart = 0, totalPausedTime = 0, pauseStartTime = 0, recData = [], activePlaybackId = null, recInterval = null;

let GEMINI_API_KEY = localStorage.getItem('gemini_key') || "";

// --- 1. CORE AUDIO ---
function playNote(midi, isAuto = false, dur = 1.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (activeOscs.has(midi) && !isAuto) return;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), audioCtx.currentTime);
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start();

    if (!isAuto) {
        activeOscs.set(midi, { osc, g });
        if (isRecording && !isPaused) recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'on' });
    } else {
        setTimeout(() => { g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); setTimeout(() => osc.stop(), 200); }, dur * 1000);
        return { osc, g };
    }
}

function stopNote(midi) {
    if (activeOscs.has(midi)) {
        const { osc, g } = activeOscs.get(midi);
        g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => osc.stop(), 200);
        activeOscs.delete(midi);
        if (isRecording && !isPaused) recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'off' });
    }
}

// --- 2. KEYBOARD ---
const piano = document.getElementById('piano-keys');
if (piano) {
    for (let i = 0; i < 64; i++) {
        const midi = 36 + i;
        const label = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
        const key = document.createElement('div');
        key.className = `key ${label.includes('#') ? 'black' : 'white'}`;
        key.innerHTML = `<span>${label}</span>`;
        key.dataset.midi = midi;
        key.onmousedown = (e) => { e.preventDefault(); key.classList.add('active'); playNote(midi); document.getElementById('note-display').innerText = label; };
        key.onmouseup = () => { key.classList.remove('active'); stopNote(midi); };
        key.onmouseleave = () => { if (activeOscs.has(midi)) { key.classList.remove('active'); stopNote(midi); } };
        piano.appendChild(key);
    }
}

// --- 3. RECORDING ---
const MAX_REC_TIME = 15; // Set limit to 15 seconds
function handleRecording() {
    const btn = document.getElementById('rec-btn');
    const pBtn = document.getElementById('pause-btn');
    const timerEl = document.getElementById('rec-timer');

    if (!isRecording) {
        // START RECORDING
        isRecording = true;
        isPaused = false;
        recStart = Date.now();
        totalPausedTime = 0;
        recData = [];

        btn.innerText = "SAVE";
        btn.style.background = "white";
        btn.style.color = "black";
        pBtn.style.display = "block";
        timerEl.style.display = "block";
        timerEl.classList.add('active');

        let secondsLeft = MAX_REC_TIME;
        timerEl.innerText = `00:${secondsLeft}`;

        // Timer Loop
        recInterval = setInterval(() => {
            if (!isPaused) {
                secondsLeft--;
                timerEl.innerText = `00:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;

                if (secondsLeft <= 0) {
                    handleRecording(); // Trigger Auto-Stop and Save
                }
            }
        }, 1000);

    } else {
        // STOP & SAVE
        isRecording = false;
        clearInterval(recInterval);

        btn.innerText = "REC";
        btn.style.background = "red";
        btn.style.color = "white";
        pBtn.style.display = "none";
        timerEl.style.display = "none";
        timerEl.classList.remove('active');

        if (recData.length > 0) {
            const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
            const newName = "Studio Mix " + (saved.length + 1);
            saved.push({ id: Date.now(), name: newName, data: recData });
            localStorage.setItem('sb_pro_v4', JSON.stringify(saved));

            renderUser();
            alert("Mix saved to User Tones.");
        }
    }
}

function togglePauseRec() {
    isPaused = !isPaused;
    if (isPaused) pauseStartTime = Date.now();
    else totalPausedTime += (Date.now() - pauseStartTime);
    document.getElementById('pause-btn').innerText = isPaused ? "RESUME" : "PAUSE";
}

// --- 4. PLAYBACK ---
function playAsset(motif, dur) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    sampleVoices.forEach(v => { try { v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05); v.osc.stop(); } catch (e) { } });
    sampleVoices = [];
    motif.forEach((v, i) => {
        setTimeout(() => {
            const s = playNote(55 + v, true, 0.5); sampleVoices.push(s);
            const k = document.querySelector(`[data-midi="${55 + v}"]`);
            if (k) { k.classList.add('active'); setTimeout(() => k.classList.remove('active'), 150); }
        }, i * 200);
    });
}

function playArchived(id) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    const mix = saved.find(m => m.id === id);
    if (!mix) return;

    const btn = document.getElementById(`play-user-${id}`);

    // Toggle STOP if already playing
    if (activePlaybackId === id) {
        activePlaybackId = null;
        btn.innerHTML = '<i class="fa fa-play"></i>';
        return;
    }

    activePlaybackId = id;
    btn.innerHTML = '<i class="fa fa-pause"></i>';
    const voices = new Map();

    mix.data.forEach(e => {
        setTimeout(() => {
            if (activePlaybackId !== id) return;
            if (e.type === 'on') {
                const s = playNote(e.midi, true, 1.5);
                voices.set(e.midi, s);
                document.querySelector(`[data-midi="${e.midi}"]`)?.classList.add('active');
            } else {
                const s = voices.get(e.midi);
                if (s) {
                    s.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
                    voices.delete(e.midi);
                }
                document.querySelector(`[data-midi="${e.midi}"]`)?.classList.remove('active');
            }
        }, e.time);
    });

    // --- NEW: THE AUTO-RESET LOGIC ---
    // Find the timestamp of the very last event in this recording
    const lastEventTime = mix.data.length > 0 ? mix.data[mix.data.length - 1].time : 0;

    setTimeout(() => {
        // Only reset if this specific track is still the one "active"
        if (activePlaybackId === id) {
            activePlaybackId = null;
            btn.innerHTML = '<i class="fa fa-play"></i>';
            console.log("Playback finished, UI reset.");
        }
    }, lastEventTime + 500); // Reset 0.5s after the last note
}

// --- 5. GEMINI AI ---
// --- 6. GEMINI 3 API INTEGRATION (UPDATED FOR YOUR KEY) ---

async function callGemini(prompt) {
    if (!GEMINI_API_KEY) {
        alert("Add API Key in Settings!");
        return null;
    }

    // MATCHED FROM YOUR LIST: gemini-flash-latest
    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 429) return "Error: AI is busy. Wait 30s.";
            return "Error: " + (data.error ? data.error.message : "API Issue");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        return "Error: Connection failed.";
    }
}

async function analyzeWithAI(id, midiArray) {
    const report = document.getElementById(`ai-report-${id}`);
    if (!midiArray.length) { report.innerText = "AI: No notes to play."; return; }

    report.innerText = "AI thinking...";
    const names = midiArray.map(m => noteNames[m % 12]).join(', ');
    const res = await callGemini(`Analyze these notes: [${names}]. In 10 words, tell me the chord name and the mood.`);
    if (res) report.innerText = "AI: " + res;
}

async function generateAITone() {
    const vibe = document.getElementById('vibe-input').value;
    if (!vibe) return alert("Enter a vibe!");

    document.getElementById('note-display').innerText = "AI composing...";
    const res = await callGemini(`Return ONLY a JSON array of 5 MIDI offsets for the mood: "${vibe}". No markdown, no text. e.g. [0, 4, 7, 10, 12]`);

    if (!res || res.includes("Error")) {
        alert(res || "AI error. Try again!");
        return;
    }

    try {
        // SMART PARSER: This finds the [ ] even if Gemini adds extra text
        const jsonMatch = res.match(/\[.*\]/);
        if (jsonMatch) {
            const motif = JSON.parse(jsonMatch[0]);
            playAsset(motif, 3);
            document.getElementById('note-display').innerText = "AI Vibe: " + vibe;
        } else {
            throw new Error("No array found");
        }
    } catch (e) {
        console.error("AI raw response:", res);
        alert("AI sent a message instead of notes. Try a simpler vibe!");
    }
}

async function analyzeWithAI(id, midiArray) {
    const report = document.getElementById(`ai-report-${id}`); report.innerText = "AI thinking...";
    const names = midiArray.map(m => noteNames[m % 12]).join(', ');
    const res = await callGemini(`Producer mode. Notes: [${names}]. In 10 words, chord name and mood.`);
    if (res) report.innerText = "AI: " + res;
}

async function generateAITone() {
    const vibe = document.getElementById('vibe-input').value;
    if (!vibe) return;
    const res = await callGemini(`Return ONLY a JSON array of 5 MIDI offsets for: "${vibe}". No markdown. e.g. [0,3,7,10,12]`);
    try { const motif = JSON.parse(res.replace(/```json|```/g, "").trim()); playAsset(motif, 3); } catch (e) { alert("AI error. Try another vibe!"); }
}

// --- 6. UTILS ---
function renderLibrary(s = "", g = "All") {
    const grid = document.getElementById('lib-grid'); if (!grid) return; grid.innerHTML = '';
    toneLibrary.filter(t => t.name.toLowerCase().includes(s.toLowerCase()) && (g === "All" || t.genre === g)).forEach(tone => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><h4>${tone.name}</h4><small>${tone.genre}</small></div>
            <div class="actions"><button class="tool-btn" onclick="shareMe('${tone.name}')"><i class="fa fa-share-nodes"></i> Share</button>
            <button class="play-btn" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur})"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

function renderUser() {
    const grid = document.getElementById('user-grid'); if (!grid) return;
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333; padding:20px;">No sessions archived.</p>' : '';
    saved.forEach(mix => {
        const midiList = [...new Set(mix.data.filter(e => e.type === 'on').map(e => e.midi))];
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `
            <div class="card-top">
                <div class="card-icon" style="background:#333"><i class="fa fa-microphone"></i></div>
                <div>
                    <h4>${mix.name}</h4>
                    <small id="ai-report-${mix.id}" style="color:var(--studio-blue); font-style:italic; font-size:11px;">AI: No analysis yet.</small>
                </div>
            </div>
            <div class="actions">
                <button class="tool-btn" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i></button>
                
                <!-- THE RESTORED AI BUTTON -->
                <button class="tool-btn" style="color:var(--studio-blue)" onclick="analyzeWithAI(${mix.id}, [${midiList}])">
                    <i class="fa fa-robot"></i> AI
                </button>

                <button class="play-btn" id="play-user-${mix.id}" onclick="playArchived(${mix.id})">
                    <i class="fa fa-play"></i>
                </button>
            </div>`;
        grid.appendChild(card);
    });
}

function delUser(id) {
    let s = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    localStorage.setItem('sb_pro_v4', JSON.stringify(s.filter(m => m.id !== id)));
    renderUser();
}

function shareMe(n) {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: 'Aura Studio', text: `Check out my tone: ${n}`, url: url });
    else alert("Link copied!");
}

function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (e) e.currentTarget.classList.add('active');
}

function openSettings() {
    const key = prompt("Enter Gemini API Key:", GEMINI_API_KEY);
    if (key) { GEMINI_API_KEY = key; localStorage.setItem('gemini_key', key); }
}

function runGlobalSearch() { const q = document.getElementById('search-box').value; if (q.length > 0) navTo(null, 'pane-library'); renderLibrary(q); }
function filterByGenre(g) { document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active')); event.currentTarget.classList.add('active'); renderLibrary("", g); }

function init() {
    const board = document.getElementById('manual-board');
    if (board) board.innerHTML = manualData.map(m => `<div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')"><div class="pin"></div><h3 class="note-heading">${m.head}</h3><p class="note-content">${m.body}</p></div>`).join('');
    renderLibrary(); renderUser();
}
window.onload = init;