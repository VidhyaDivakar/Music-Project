const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];
let isRecording = false, isPaused = false, recStart = 0, totalPausedTime = 0, pauseStartTime = 0, recData = [], activePlaybackId = null;

// --- KEYBOARD ---
const piano = document.getElementById('piano-keys');
if (piano) {
    for (let i = 0; i < 64; i++) {
        const midi = 36 + i;
        const label = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
        const key = document.createElement('div');
        key.className = `key ${label.includes('#') ? 'black' : 'white'}`;
        key.innerHTML = `<span>${label}</span>`;
        key.dataset.midi = midi;
        key.onmousedown = (e) => { e.preventDefault(); if (audioCtx.state === 'suspended') audioCtx.resume(); key.classList.add('active'); playNote(midi); document.getElementById('note-display').innerText = label; };
        key.onmouseup = () => { key.classList.remove('active'); stopNote(midi); };
        key.onmouseleave = () => { if (activeOscs.has(midi)) { key.classList.remove('active'); stopNote(midi); } };
        piano.appendChild(key);
    }
}

function playNote(midi, isAuto = false, dur = 1.5) {
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
        if (isRecording && !isPaused) recData.push({ time: Date.now() - recStart - totalPausedTime, midi, type: 'on' });
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
        if (isRecording && !isPaused) recData.push({ time: Date.now() - recStart - totalPausedTime, midi, type: 'off' });
    }
}

function playAsset(motif, dur) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    sampleVoices.forEach(v => { try { v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05); setTimeout(() => v.osc.stop(), 100); } catch (e) { } });
    sampleVoices = [];
    motif.forEach((v, i) => {
        setTimeout(() => {
            const s = playNote(55 + v, true, 0.5);
            sampleVoices.push(s);
            const k = document.querySelector(`[data-midi="${55 + v}"]`);
            if (k) { k.classList.add('active'); setTimeout(() => k.classList.remove('active'), 150); }
        }, i * 200);
    });
}

function handleRecording() {
    const btn = document.getElementById('rec-btn'), pBtn = document.getElementById('pause-btn');
    if (!isRecording) {
        isRecording = true; isPaused = false; recStart = Date.now(); totalPausedTime = 0; recData = [];
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
    if (!isPaused) { isPaused = true; pauseStartTime = Date.now(); pBtn.innerText = "RESUME"; }
    else { isPaused = false; totalPausedTime += (Date.now() - pauseStartTime); pBtn.innerText = "PAUSE"; }
}

function renderLibrary(s = "", g = "All") {
    const grid = document.getElementById('lib-grid'); if (!grid) return; grid.innerHTML = '';
    toneLibrary.filter(t => t.name.toLowerCase().includes(s.toLowerCase()) && (g === "All" || t.genre === g)).forEach(tone => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><div class="card-icon" style="background:${tone.color}"><i class="fa ${tone.icon}"></i></div><div><h4>${tone.name}</h4><small>${tone.genre}</small></div></div>
            <div class="actions"><button class="tool-btn" onclick="alert('Shared!')"><i class="fa fa-share-nodes"></i> Share</button><button class="play-btn" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur})"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

function renderUser() {
    const grid = document.getElementById('user-grid'); if (!grid) return;
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333; padding:20px;">No sessions archived.</p>' : '';
    saved.forEach(mix => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><div class="card-icon" style="background:#333"><i class="fa fa-microphone"></i></div><h4>${mix.name}</h4></div>
            <div class="actions"><button class="tool-btn" style="color:#ff5252" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i> Delete</button><button class="play-btn" id="play-user-${mix.id}" onclick="playArchived(${mix.id}, ${JSON.stringify(mix.data)})"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

function playArchived(id, data) {
    const btn = document.getElementById(`play-user-${id}`);
    if (activePlaybackId === id) { activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; return; }
    activePlaybackId = id; btn.innerHTML = '<i class="fa fa-pause"></i>';
    data.forEach(e => {
        setTimeout(() => {
            if (activePlaybackId !== id) return;
            if (e.type === 'on') {
                playNote(e.midi, true, 1.2);
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

function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (e) e.currentTarget.classList.add('active');
    document.getElementById('main-nav').style.display = (id === 'pane-studio') ? 'none' : 'flex';
}

function runGlobalSearch() {
    const q = document.getElementById('search-box').value;
    if (q.length > 0) navTo(null, 'pane-library');
    renderLibrary(q);
}

function filterByGenre(g) {
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active'); renderLibrary("", g);
}

const board = document.getElementById('manual-board');
if (board) {
    board.innerHTML = manualData.map(m => `
        <div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')">
            <div class="pin"></div><h3 class="note-heading">${m.head}</h3><p class="note-content">${m.body}</p>
        </div>`).join('');
}

renderLibrary(); renderUser();