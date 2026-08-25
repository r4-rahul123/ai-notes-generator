import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri);
const Note = mongoose.connection.collection("notes");
const note = await Note.findOne({ topic: /quantam/i }, { sort: { createdAt: -1 } });

// Find the "Open System" / Lindblad section
const idx = note.content.indexOf("Open System");
console.log("=== OPEN SYSTEM SECTION ===");
console.log(JSON.stringify(note.content.slice(idx, idx + 600)));

// Find a mermaid chart and print it raw
if (note.mermaidCharts && note.mermaidCharts.length) {
  console.log("\n=== MERMAID CHART[0] raw ===");
  console.log(JSON.stringify(note.mermaidCharts[0].slice(0, 600)));
}

await mongoose.disconnect();
