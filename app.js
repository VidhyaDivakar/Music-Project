const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const activeOscs = new Map();
let sampleVoices = [];
let isRecording = false, recStart = 0, recData = [], activePlaybackId = null, recInterval = null;
let GEMINI_API_KEY = localStorage.getItem('gemini_key') || "";

// 1. LAPTOP MAPPING (4 Octaves)
const keyMap = {
    '1': 36, '2': 37, '3': 38, '4': 39, '5': 40, '6': 41, '7': 42, '8': 43, '9': 44, '0': 45,
    'q': 48, 'w': 49, 'e': 50, 'r': 51, 't': 52, 'y': 53, 'u': 54, 'i': 55, 'o': 56, 'p': 57,
    'a': 60, 's': 61, 'd': 62, 'f': 63, 'g': 64, 'h': 65, 'j': 66, 'k': 67, 'l': 68, ';': 69,
    'z': 72, 'x': 73, 'c': 74, 'v': 75, 'b': 76, 'n': 77, 'm': 78, ',': 79, '.': 80, '/': 81
};
const revMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, k]));

window.addEventListener('keydown', e => {
    if (document.activeElement.tagName === 'INPUT') return;
    const m = keyMap[e.key.toLowerCase()];
    if (m && !activeOscs.has(m)) { document.querySelector(`[data-midi="${m}"]`)?.classList.add('active'); playNote(m); }
});
window.addEventListener('keyup', e => {
    const m = keyMap[e.key.toLowerCase()];
    if (m) { document.querySelector(`[data-midi="${m}"]`)?.classList.remove('active'); stopNote(m); }
});

// 2. AUDIO ENGINE
// Add a tracker for user activity to the ribbon logic
let lastUserActivity = Date.now();

function playNote(midi, isAuto = false, dur = 1.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Clear "Sonic Identity" if user starts playing manually
    if (!isAuto) {
        lastUserActivity = Date.now();
        document.getElementById('note-display').style.color = "var(--studio-blue)";
    }

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
        setTimeout(() => { try { osc.stop(); } catch (e) { } }, 200);
        activeOscs.delete(midi);
        if (isRecording && !isPaused) recData.push({ time: Date.now() - recStart - totalPausedTime, midi, type: 'off' });
    }
}

// 3. PIANO RENDERING
const pianoRef = document.getElementById('piano-keys');
if (pianoRef) {
    for (let i = 0; i < 64; i++) {
        const midi = 36 + i;
        const label = noteNames[midi % 12] + (Math.floor(midi / 12) - 1);
        const compKey = revMap[midi];
        const key = document.createElement('div');
        key.className = `key ${label.includes('#') ? 'black' : 'white'}`;
        key.innerHTML = `<span>${label}</span>${compKey ? `<div class="key-hint">${compKey.toUpperCase()}</div>` : ''}`;
        key.dataset.midi = midi;
        key.onmousedown = (e) => { e.preventDefault(); key.classList.add('active'); playNote(midi); };
        key.onmouseup = () => { key.classList.remove('active'); stopNote(midi); };
        pianoRef.appendChild(key);
    }
}

// 4. RECORDING & AI
function handleRecording() {
    const btn = document.getElementById('rec-btn'), timerEl = document.getElementById('rec-timer');
    if (!isRecording) {
        isRecording = true; recStart = Date.now(); recData = [];
        btn.innerText = "SAVE"; timerEl.style.display = "inline";
        let sec = 15;
        recInterval = setInterval(() => { sec--; timerEl.innerText = `00:${sec < 10 ? '0' : ''}${sec}`; if (sec <= 0) handleRecording(); }, 1000);
    } else {
        isRecording = false; clearInterval(recInterval);
        btn.innerText = "REC"; timerEl.style.display = "none";
        if (recData.length > 0) {
            const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
            saved.push({ id: Date.now(), name: "Un-named Session", data: recData, aiReport: null });
            localStorage.setItem('sb_pro_v4', JSON.stringify(saved));
            renderUser(); navTo(null, 'pane-user');
        }
    }
}

async function callGemini(prompt) {
    if (!GEMINI_API_KEY) return alert("Set API Key in Settings!");

    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}

// Update this inside your keydown listener and mousedown listener:
// document.getElementById('note-display').innerText = label;

async function analyzeWithAI(id, midiArray) {
    const report = document.getElementById(`ai-report-${id}`), titleEl = document.getElementById(`card-title-${id}`);
    const monitor = document.getElementById('note-display');

    report.innerText = "AI Vibe-checking...";
    const names = midiArray.map(m => noteNames[m % 12]).join(', ');

    // Improved Prompt for UNIQUENESS
    const prompt = `Act as a cutting-edge music producer. Notes: [${names}]. 
    1. If it's a known song, name it. 
    2. Otherwise, give it a unique 2-word trendy name.
    3. Provide a 10-word analysis. 
    Format: Name: [Name] | Analysis: [Analysis]`;

    const res = await callGemini(prompt);
    if (res && res.includes('|')) {
        const [n, a] = res.split('|');
        const trendyName = n.replace('Name:', '').trim();
        const analysis = a.replace('Analysis:', '').trim();

        // Update Card
        titleEl.innerText = trendyName;
        report.innerText = analysis;

        // UPDATE RIBBON: Show the Sonic Identity
        monitor.innerText = "Sonic Identity: " + trendyName;
        monitor.style.color = "var(--ai-purple)";

        // Save to LocalStorage
        const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
        const idx = saved.findIndex(m => m.id === id);
        if (idx !== -1) { saved[idx].aiReport = analysis; saved[idx].name = trendyName; localStorage.setItem('sb_pro_v4', JSON.stringify(saved)); }
    }
}

/**
 * 1. UPDATED: GENERATIVE AI LOGIC (10s Ambient & Rolling 20 Limit)
 */
/** 
 AI COMPOSER: Stylistic Song Recognition 
 */
async function generateAITone() {
    const vibe = document.getElementById('vibe-input').value;
    if (!vibe) return;

    // FORCING UNIQUENESS: Instructions for specific scales/intervals
    const prompt = `Compose a 10-second MIDI motif for: "${vibe}". 
    - If 'Happy': Use Major 7ths and high octaves.
    - If 'Sad': Use Minor 2nds and slow descending intervals.
    - If 'Action': Use staccato Tritones and fast rhythmic jumps.
    Return ONLY a JSON array of 15 MIDI offsets (e.g. [0, 2, -5...]). No text.`;

    const res = await callGemini(prompt);
    try {
        const cleanJson = res.match(/\[.*\]/)[0];
        const motif = JSON.parse(cleanJson);
        playAsset(motif, 3, "ai_gen");
    } catch (e) { alert("AI Compose Error. Try a different mood!"); }
}

/**
 * 2. NEW: RENDERER FOR THE AI TAB
 */
function renderAIAssets() {
    const grid = document.getElementById('ai-grid');
    if (!grid) return;

    const saved = JSON.parse(localStorage.getItem('sb_ai_assets') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333">No AI soundscapes generated yet.</p>' : '';

    saved.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'tone-card';
        card.style.borderLeft = `5px solid var(--ai-purple)`;

        card.innerHTML = `
            <div class="card-top">
                <div class="card-icon" style="background:var(--ai-purple)"><i class="fa fa-magic"></i></div>
                <div>
                    <h4>${asset.name}</h4>
                    <small style="color:#555">${asset.timestamp} • 10s Ambient</small>
                </div>
            </div>
            <div class="actions">
                // Change the share button line to this:
<button class="tool-btn" onclick="shareMe('${asset.name}', 'AI-composed soundscape')">
    <i class="fa fa-share-nodes"></i>
</button>
                <button class="play-btn" id="play-ai-${asset.id}" onclick="playAsset(${JSON.stringify(asset.motif)}, 10, 'ai-${asset.id}')">
                    <i class="fa fa-play"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Ensure you call this in your init() function
function init() {
    renderUser();
    renderLibrary();
    renderAIAssets(); // Added this call
    // ... manual board logic ...
}

// 5. LIBRARY RENDERING
function renderLibrary(s = "", g = "All") {
    const grid = document.getElementById('lib-grid'); if (!grid) return; grid.innerHTML = '';
    toneLibrary.filter(t => (t.name.toLowerCase().includes(s.toLowerCase()) && (g === "All" || t.genre === g))).forEach(tone => {
        const card = document.createElement('div'); card.className = 'tone-card';
        card.style.borderTop = `5px solid ${tone.color}`;
        card.innerHTML = `<div class="card-top"><h4>${tone.name}</h4><small>${tone.genre}</small></div>
            <div class="actions"><button class="tool-btn" onclick="shareMe('${tone.name}', 'preset tone')">
    <i class="fa fa-share-nodes"></i>
</button><i class="fa fa-share-nodes"></i></button>
            <button class="play-btn" id="play-lib-${tone.name.replace(/\s+/g, '')}" onclick="playAsset(${JSON.stringify(tone.motif)}, ${tone.dur}, '${tone.name.replace(/\s+/g, '')}')"><i class="fa fa-play"></i></button></div>`;
        grid.appendChild(card);
    });
}

/* 2. PLAYBACK ENGINE: Functional Play / Pause / Stop
   */
function playAsset(motif, dur, id) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Find the button (works for Library, User Mix, and AI Scratchpad)
    const btn = document.querySelector(`[onclick*='${id}']`) || document.getElementById(`play-ai-${id.split('-')[1]}`);

    // TOGGLE OFF: If this specific ID is already playing, STOP it.
    if (activePlaybackId === id) {
        activePlaybackId = null;
        if (btn) btn.innerHTML = '<i class="fa fa-play"></i>';
        sampleVoices.forEach(v => { try { v.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); v.osc.stop(); } catch (e) { } });
        sampleVoices = [];
        return;
    }

    // TOGGLE ON: Stop any other sound and play this one
    activePlaybackId = id;
    if (btn) btn.innerHTML = '<i class="fa fa-pause"></i>';

    // Clear previous audio
    sampleVoices.forEach(v => { try { v.osc.stop(); } catch (e) { } });
    sampleVoices = [];

    motif.forEach((v, i) => {
        setTimeout(() => {
            if (activePlaybackId !== id) return; // Stop if user toggled off
            const s = playNote(55 + v, true, 1.2);
            sampleVoices.push(s);

            // Highlight keys
            const k = document.querySelector(`[data-midi="${55 + v}"]`);
            if (k) { k.classList.add('active'); setTimeout(() => k.classList.remove('active'), 200); }
        }, i * 600); // 10 second stretch
    });

    // Reset button after 10s
    setTimeout(() => {
        if (activePlaybackId === id) {
            activePlaybackId = null;
            if (btn) btn.innerHTML = '<i class="fa fa-play"></i>';
        }
    }, motif.length * 600 + 500);
}


function renderUser() {
    const grid = document.getElementById('user-grid'); if (!grid) return;
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    grid.innerHTML = saved.length === 0 ? '<p style="color:#333">Sessions appear here.</p>' : '';
    saved.forEach(mix => {
        const midiList = [...new Set(mix.data.filter(e => e.type === 'on').map(e => e.midi))];
        const card = document.createElement('div'); card.className = 'tone-card';
        card.innerHTML = `<div class="card-top"><div><h4>${mix.name}</h4><small id="ai-report-${mix.id}" style="color:var(--studio-blue)">${mix.aiReport || 'Ready for Gemini analysis.'}</small></div></div>
            <div class="actions"><button class="tool-btn" onclick="delUser(${mix.id})"><i class="fa fa-trash"></i></button>
            <button class="tool-btn" onclick="analyzeWithAI(${mix.id}, [${midiList}])"><i class="fa fa-wand-magic-sparkles"></i> AI</button>
            <button class="play-btn" id="play-user-${mix.id}" onclick="playArchived(${mix.id})"><i class="fa fa-play"></i></button>
            // Change the share button line to this:
<button class="tool-btn" onclick="shareMe('${mix.name}', 'personal recording')">
    <i class="fa fa-share-nodes"></i>
</button></div>`;
        grid.appendChild(card);
    });
}

function playArchived(id) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const saved = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]');
    const mix = saved.find(m => m.id === id); if (!mix) return;
    const btn = document.getElementById(`play-user-${id}`);
    if (activePlaybackId === id) { activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; return; }
    activePlaybackId = id; btn.innerHTML = '<i class="fa fa-pause"></i>';
    const voices = new Map();
    mix.data.forEach(e => {
        setTimeout(() => {
            if (activePlaybackId !== id) { voices.forEach(v => v.osc.stop()); return; }
            if (e.type === 'on') { const s = playNote(e.midi, true, 2.0); voices.set(e.midi, s); document.querySelector(`[data-midi="${e.midi}"]`)?.classList.add('active'); }
            else { const s = voices.get(e.midi); if (s) { s.g.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05); voices.delete(e.midi); } document.querySelector(`[data-midi="${e.midi}"]`)?.classList.remove('active'); }
        }, e.time);
    });
    setTimeout(() => { if (activePlaybackId === id) { activePlaybackId = null; btn.innerHTML = '<i class="fa fa-play"></i>'; } }, mix.data[mix.data.length - 1].time + 1000);
}

// 6. NAVIGATION & UTILS
function navTo(e, id) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); if (e) e.currentTarget.classList.add('active');
}
function delUser(id) { let s = JSON.parse(localStorage.getItem('sb_pro_v4') || '[]'); localStorage.setItem('sb_pro_v4', JSON.stringify(s.filter(m => m.id !== id))); renderUser(); }
function openSettings() { const key = prompt("Enter Gemini API Key:", GEMINI_API_KEY); if (key) { GEMINI_API_KEY = key; localStorage.setItem('gemini_key', key); } }
function runGlobalSearch() { const q = document.getElementById('search-box').value; if (q.length > 0) { navTo(null, 'pane-library'); renderLibrary(q); } }
function filterByGenre(g) { document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active')); event.currentTarget.classList.add('active'); renderLibrary("", g); }


function init() {
    renderUser(); renderLibrary();
    const board = document.getElementById('manual-board');
    if (board) board.innerHTML = manualData.map(m => `<div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')"><div class="pin"></div><h3 class="note-heading">${m.head}</h3><p class="note-content">${m.body}</p></div>`).join('');
}
window.onload = init;

function shareMe(name, type = "tone") {
    const shareText = `Check out this unique ${type} "${name}" I created on Aura Studio Pro! 🎹✨`;
    const shareUrl = window.location.href;

    // 1. Primary: Native Mobile/Modern Sharing
    if (navigator.share) {
        navigator.share({
            title: 'Aura Studio Pro',
            text: shareText,
            url: shareUrl
        }).catch(() => console.log("Share cancelled by user"));
    }
    // 2. Secondary: If on Desktop, use Clipboard (Cleaner than WhatsApp popups)
    else if (navigator.clipboard) {
        const fullContent = `${shareText} ${shareUrl}`;
        navigator.clipboard.writeText(fullContent).then(() => {
            alert("Description & Link copied to clipboard! You can now paste it in WhatsApp or Facebook.");
        });
    }
    // 3. Final Fallback: Old-school Alert
    else {
        alert(`Copy this to share: ${shareText} ${shareUrl}`);
    }
}