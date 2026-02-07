const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];
let isRecording = false;
let isPaused = false;
let recStart = 0;
let totalPausedTime = 0;
let pauseStartTime = 0;
let recData = [];
let activePlaybackId = null;

// --- AUDIO ENGINE ---
function playNote(midi, isAuto = false, dur = 1.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (activeOscs.has(midi) && !isAuto) return;

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), audioCtx.currentTime);

    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);

    osc.connect(g); g.connect(audioCtx.destination);
    osc.start();

    if (!isAuto) {
        activeOscs.set(midi, { osc, g });
        if (isRecording && !isPaused) {
            recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'on' });
        }
    } else {
        setTimeout(() => {
            g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
            setTimeout(() => osc.stop(), 200);
        }, dur * 1000);
        return { osc, g };
    }
}

function stopNote(midi) {
    if (activeOscs.has(midi)) {
        const { osc, g } = activeOscs.get(midi);
        g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        setTimeout(() => osc.stop(), 200);
        activeOscs.delete(midi);
        if (isRecording && !isPaused) {
            recData.push({ time: Date.now() - recStart - totalPausedTime, midi: midi, type: 'off' });
        }
    }
}

// --- KEYBOARD ---
const piano = document.getElementById('piano-keys');
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

// --- RECORDING LOGIC ---
function handleRecording() {
    const btn = document.getElementById('rec-btn');
    const pBtn = document.getElementById('pause-btn');
    if (!isRecording) {
        isRecording = true; isPaused = false;
        recStart = Date.now(); totalPausedTime = 0; recData = [];
        btn.innerText = "SAVE"; pBtn.style.display = "block";
    } else {
        isRecording = false; btn.innerText = "REC"; pBtn.style.display = "none";
        if (recData.length > 0) {
            const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
            saved.push({ id: Date.now(), name: "User Mix " + saved.length, data: recData });
            localStorage.setItem('sb_pro_v4', JSON.stringify(saved));
            renderUser();
        }
    }
}

function togglePauseRec() {
    const pBtn = document.getElementById('pause-btn');
    if (!isPaused) {
        isPaused = true; pauseStartTime = Date.now(); pBtn.innerText = "RESUME";
    } else {
        isPaused = false; totalPausedTime += (Date.now() - pauseStartTime); pBtn.innerText = "PAUSE";
    }
}

function playAsset(motif, dur) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // 1. STOP ALL PREVIOUS SOUNDS (The most important part)
    // This clears the "glaring" overlap immediately
    sampleVoices.forEach(v => {
        try {
            v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
            setTimeout(() => v.osc.stop(), 100);
        } catch (e) { }
    });
    sampleVoices = [];

    // 2. DYNAMIC PLAYBACK
    // We use a middle-range pitch (55) so it sounds good for both bass and lead tones
    motif.forEach((v, i) => {
        setTimeout(() => {
            // We set the note length to 0.5s so they "breathe" but don't overlap
            const s = playNote(55 + v, true, 0.5);
            sampleVoices.push(s);

            // Visual feedback: flashes the keys as the asset plays
            const key = document.querySelector(`[data-midi="${55 + v}"]`);
            if (key) {
                key.classList.add('active');
                setTimeout(() => key.classList.remove('active'), 150);
            }
        }, i * 200); // 200ms is the standard "Asset" tempo
    });
}
function renderUser() {
    const grid = document.getElementById('user-grid');
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333">No sessions archived.</p>' : '';
    saved.forEach(mix => {
        const card = document.createElement('div');
        card.className = 'tone-card';
        card.innerHTML = `
            <div class="card-top"><div class="card-icon" style="background:#333"><i class="fa fa-microphone"></i></div><h4>${mix.name}</h4></div>
            <div class="actions">
                <button class="tool-btn" style="color:#ff5252" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i> Delete</button>
                <button class="play-btn" id="play-user-${mix.id}" onclick="playArchived(${mix.id}, ${JSON.stringify(mix.data)})"><i class="fa fa-play"></i></button>
            </div>`;
        grid.appendChild(card);
    });
}

function playArchived(id, data) {
    const btn = document.getElementById(`play-user-${id}`);
    if (activePlaybackId === id) {
        activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>';
        sampleVoices.forEach(v => { v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); });
        return;
    }
    activePlaybackId = id; btn.innerHTML = '<i class="fa fa-pause"></i>';
    data.forEach(e => {
        setTimeout(() => {
            if (activePlaybackId !== id) return;
            if (e.type === 'on') {
                const s = playNote(e.midi, true, 1.2); sampleVoices.push(s);
                const k = document.querySelector(`[data-midi="${e.midi}"]`);
                if (k) { k.classList.add('active'); setTimeout(() => k.classList.remove('active'), 200); }
            }
        }, e.time);
    });
}

function delUser(id) {
    let saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    localStorage.setItem('sb_pro_v4', JSON.stringify(saved.filter(m => m.id !== id)));
    renderUser();
}

// --- NAV & SEARCH ---
function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (e) e.currentTarget.classList.add('active');

    document.getElementById('main-nav').style.display = (id === 'pane-studio') ? 'none' : 'flex';
}

function runGlobalSearch() {
    const q = document.getElementById('search-box').value.toLowerCase();
    if (q.length > 0) navTo(null, 'pane-library');
    renderLibrary(q);
}

// --- MANUAL & INIT ---
const manualData = [
    { h: "The Vision", b: "Aura Studio captures musical 'happy accidents'. Play, discover, and archive unique signatures instantly.", c: "green" },
    { h: "Pause/Resume", b: "Need a break during a long record? Use the Pause button. We keep your timing perfect.", c: "yellow" },
    { h: "Library Search", b: "Use the global search to find Mario, Elsa, or ASMR motifs from any page.", c: "yellow" },
    { h: "Pro Keyboard", b: "64 high-fidelity keys with long-press sustain for cinematic sound design.", c: "green" }
];

function init() {
    const board = document.getElementById('manual-board');
    board.innerHTML = manualData.map(m => `
        <div class="sticky-note ${m.c}" onclick="this.classList.toggle('expanded')">
            <div class="pin"></div><h3 class="note-heading">${m.h}</h3><p class="note-content">${m.b}</p>
        </div>`).join('');
    renderLibrary(); renderUser();
}

function renderLibrary(s = "", g = "All") {
    const grid = document.getElementById('lib-grid'); grid.innerHTML = '';
    toneLibrary.filter(t => (t.name.toLowerCase().includes(s) && (g === "All" || t.genre === g))).forEach(tone => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><div class="card-icon" style="background:${tone.color}"><i class="fa ${tone.icon}"></i></div><div><h4>${tone.name}</h4><small>${tone.genre}</small></div></div>
            <div class="actions"><button class="tool-btn" onclick="alert('Shared!')"><i class="fa fa-share-nodes"></i></button><button class="play-btn" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur})"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

function filterByGenre(g) {
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active'); renderLibrary("", g);
}

init();