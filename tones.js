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
    { head: "The Vision", body: "Aura Studio is where 'happy accidents' become permanent assets. Discover unique signatures in every click. We built this for the dreamers who find a melody but don't have a pen.", color: "green" },
    { head: "PWA Power", body: "Install this app on your phone! It works offline and saves all your tones to local memory. Access your studio anytime, anywhere, even without internet.", color: "yellow" },
    { head: "Composition", body: "Play a melody on the keyboard. Hit REC. Your performance is instantly archived as a high-quality tone in your gallery. Pause and Resume as needed.", color: "yellow" },
    { head: "Integration", body: "Export your tones, share them via WhatsApp, or use them as UI notifications for your next app project. Every sound is a sharable asset.", color: "green" }
];