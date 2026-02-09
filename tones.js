const toneLibrary = [
    { name: "Bad Guy - Billie", genre: "Viral Pop Snippets", icon: "fa-mask", color: "#BADA55", motif: [0, 0, 3, 5, 0, 0, 6, 5, 3], dur: 3 },
    { name: "Super Mario Jump", genre: "Gaming Classics", icon: "fa-gamepad", color: "#E52521", motif: [0, 12, 24], dur: 3 },
    { name: "Pikachu Pika!", genre: "Gaming Classics", icon: "fa-bolt", color: "#FFDE00", motif: [12, 14, 12], dur: 3 },
    { name: "Frozen Elsa Arp", genre: "Viral Pop Snippets", icon: "fa-snowflake", color: "#81D4FA", motif: [0, 7, 12, 16, 12, 7], dur: 4 },
    { name: "Zelda Secret", genre: "Gaming Classics", icon: "fa-shield-halved", color: "#4CAF50", motif: [5, 4, 1, 6, 5, 1, 8, 7], dur: 4 },
    { name: "Star Wars Theme", genre: "Cinematic Effects", icon: "fa-jedi", color: "#FFC107", motif: [0, 7, 5, 4, 2, 12, 7], dur: 4 },
    { name: "Encanto Sun", genre: "Viral Pop Snippets", icon: "fa-sun", color: "#FFB300", motif: [0, 3, 7, 10, 12], dur: 4 },
    { name: "Banking Success", genre: "Minimalist UI", icon: "fa-wallet", color: "#2E7D32", motif: [0, 12, 15], dur: 3 }
];

const moods = ["Mystic", "Cyber", "Happy", "Sad", "Urgent", "Dreamy", "Vintage", "Liquid"];
const styles = ["Notification", "Alert", "Loop", "Signature", "Ping"];
for (let i = 1; i <= 100; i++) {
    toneLibrary.push({
        name: `${moods[i % moods.length]} ${styles[i % styles.length]} ${i}`,
        genre: i < 25 ? "Retro & Lofi" : i < 50 ? "Minimalist UI" : "ASMR & Nature",
        icon: "fa-waveform", color: "#333",
        motif: [i % 12, (i + 5) % 12, (i + 12) % 12], dur: 3
    });
}

const manualData = [
    {
        head: "Aura Studio Core",
        body: "Aura Studio is a high-fidelity sound workstation. Play the keyboard, hit REC to capture, and use Pause/Resume for precision. Once saved, click the 'AI' Robot to send your note sequences to the Google Gemini 1.5 Flash API. Gemini analyzes the harmonic structure, renames your mix with a trendy title, and provides a deep mood analysis.",
        color: "green"
    },
    {
        head: "Gemini API Integration",
        body: "We integrated the Gemini 1.5 Flash API via the v1beta endpoint to bridge the gap between math and emotion. The app serializes MIDI data into JSON strings and prompts Gemini to act as a Resident Producer. It performs 'Latent Sentiment Analysis' to identify chords and musical intent that hard-coded algorithms would miss.",
        color: "yellow"
    },
    {
        head: "AI Compose Feature",
        body: "The AI Composer uses Generative Intelligence to turn language into music. When you type a 'vibe', Gemini generates a 5-note MIDI offset array. Our engine instantly synthesizes this into an 'Ear-con'—a short audio asset designed for app notifications, UI feedback, or modern ringtones.",
        color: "yellow"
    },
    {
        head: "PWA Power & Access",
        body: "Access Aura Studio anywhere! Install it as a standalone app by clicking the 'Install' icon in your browser address bar (Chrome) or the 'Add to Home Screen' button (Safari). It works offline via Service Workers and features full laptop keyboard mapping for a tactile studio experience.",
        color: "green"
    }
];

