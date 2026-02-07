/**
 * TONE LIBRARY - SHORT ASSETS (3-4 Seconds Max)
 */
const toneLibrary = [
    // --- GAMING CLASSICS ---
    { name: "Super Mario Jump", genre: "Gaming Classics", icon: "fa-gamepad", color: "#E52521", motif: [0, 12, 24], dur: 3 },
    { name: "Pikachu Pika!", genre: "Gaming Classics", icon: "fa-bolt", color: "#FFDE00", motif: [12, 14, 12], dur: 3 },
    { name: "Sonic Ring", genre: "Gaming Classics", icon: "fa-circle", color: "#0054FF", motif: [0, 4, 7, 12, 16, 24], dur: 3 },
    { name: "Zelda Secret", genre: "Gaming Classics", icon: "fa-shield-halved", color: "#4CAF50", motif: [5, 4, 1, 6, 5, 1, 8, 7], dur: 4 },
    { name: "Final Fantasy Fanfare", genre: "Gaming Classics", icon: "fa-flag", color: "#673AB7", motif: [0, 0, 0, 0, -2, -4, 0], dur: 4 },

    // --- VIRAL POP SNIPPETS ---
    { name: "Frozen Elsa Arp", genre: "Viral Pop Snippets", icon: "fa-snowflake", color: "#81D4FA", motif: [0, 7, 12, 16, 12, 7], dur: 4 },
    { name: "Wednesday Snap", genre: "Viral Pop Snippets", icon: "fa-hand", color: "#212121", motif: [0, 1, 0], dur: 3 },
    { name: "Encanto Sun", genre: "Viral Pop Snippets", icon: "fa-sun", color: "#FFB300", motif: [0, 3, 7, 10, 12], dur: 4 },
    { name: "Bad Guy - Billie", genre: "Viral Pop Snippets", icon: "fa-mask", color: "#BADA55", motif: [0, 0, 3, 5, 0, 0, 6, 5, 3], dur: 3 },
    { name: "Shape of You", genre: "Viral Pop Snippets", icon: "fa-shapes", color: "#2196F3", motif: [4, 6, 4, 6, 4, 1, -1], dur: 3 },

    // --- ASMR & NATURE ---
    { name: "Crystal Stream", genre: "ASMR & Nature", icon: "fa-droplet", color: "#00BCD4", motif: [12, 14, 16, 19, 21, 24], dur: 4 },
    { name: "Deep Forest Zen", genre: "ASMR & Nature", icon: "fa-leaf", color: "#2E7D32", motif: [0, 7, 12], dur: 4 },
    { name: "Morning Windchime", genre: "ASMR & Nature", icon: "fa-wind", color: "#B0BEC5", motif: [24, 21, 17, 12], dur: 4 },
    { name: "Tibetan Bowl", genre: "ASMR & Nature", icon: "fa-om", color: "#795548", motif: [0], dur: 4 },

    // --- MINIMALIST UI ---
    { name: "Banking Success", genre: "Minimalist UI", icon: "fa-wallet", color: "#2E7D32", motif: [0, 12, 15], dur: 3 },
    { name: "Apple Pay Style", genre: "Minimalist UI", icon: "fa-apple-pay", color: "#000", motif: [12, 17], dur: 3 },
    { name: "Shopping Confirm", genre: "Minimalist UI", icon: "fa-cart-shopping", color: "#FF9800", motif: [7, 12], dur: 3 },
    { name: "Email Sent", genre: "Minimalist UI", icon: "fa-paper-plane", color: "#0288D1", motif: [12, 19], dur: 3 },

    // --- CINEMATIC EFFECTS ---
    { name: "Star Wars Theme", genre: "Cinematic Effects", icon: "fa-jedi", color: "#FFC107", motif: [0, 7, 5, 4, 2, 12, 7], dur: 4 },
    { name: "Stranger Things", genre: "Cinematic Effects", icon: "fa-ghost", color: "#E50914", motif: [0, 4, 7, 11, 12, 11, 7, 4], dur: 4 },
    { name: "Mission Impossible", genre: "Cinematic Effects", icon: "fa-user-secret", color: "#000", motif: [0, 0, 3, 5, 0, 0, -2, -1], dur: 3 }
];

/**
 * GENERATE BULK LIBRARY (Short 3s durations)
 */
const moods = ["Mystic", "Cyber", "Happy", "Sad", "Urgent", "Dreamy", "Vintage", "Liquid"];
const styles = ["Notification", "Alert", "Loop", "Signature", "Ping"];

for (let i = 1; i <= 100; i++) {
    const mood = moods[i % moods.length];
    const style = styles[i % styles.length];

    let gen = "Retro & Lofi";
    if (i > 25) gen = "Minimalist UI";
    if (i > 50) gen = "ASMR & Nature";
    if (i > 75) gen = "Cinematic Effects";

    toneLibrary.push({
        name: `${mood} ${style} ${i}`,
        genre: gen,
        icon: "fa-waveform",
        color: i % 2 === 0 ? "#00A3FF" : "#333",
        motif: [i % 12, (i + 5) % 12, (i + 12) % 12],
        dur: 3 // All bulk generated tones are now 3 seconds
    });
}

/**
 * STICKY NOTE MANUAL DATA
 */
const manualData = [
    { head: "The Vision", body: "Aura Studio is where 'happy accidents' become permanent assets. Discover unique sound signatures in every click. We built this for the dreamers who find a melody but don't have a pen.", color: "green" },
    { head: "PWA Power", body: "Install this app on your phone! It works offline and saves all your tones to local memory. Access your studio anytime, anywhere, even without internet.", color: "yellow" },
    { head: "Composition", body: "Play a melody on the keyboard. Hit REC. Your performance is instantly archived as a high-quality tone in your gallery. Pause and Resume as needed.", color: "yellow" },
    { head: "Integration", body: "Export your tones, share them via WhatsApp, or use them as UI notifications for your next app project. Every sound is a sharable asset.", color: "green" }
];

function renderManual() {
    const board = document.getElementById('manual-board');
    if (!board) return;
    board.innerHTML = manualData.map(m => `
        <div class="sticky-note ${m.color}" onclick="this.classList.toggle('expanded')">
            <div class="pin"></div>
            <h3 class="note-heading">${m.head}</h3>
            <p class="note-content">${m.body}</p>
        </div>
    `).join('');
}

renderManual();