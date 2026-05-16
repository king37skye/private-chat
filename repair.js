const fs = require('fs');
const path = 'app.js';

try {
  let content = fs.readFileSync(path, 'utf8');
  
  // Clean up the common corruption patterns
  content = content.replace(/Ã¢Å“â€¦/g, '✅');
  content = content.replace(/Ã¢Â Å’/g, '❌');
  content = content.replace(/Ã¢Å“Â¨/g, '✨');
  content = content.replace(/â€”/g, '—');
  content = content.replace(/Ã¢Â/g, ''); // Common leftover junk
  
  fs.writeFileSync(path, content, 'utf8');
  console.log("✅ Node.js Repair complete.");
} catch (e) {
  console.error("❌ Repair failed:", e);
}
