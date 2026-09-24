/**
 * InterviewKit — Build Output Sync
 *
 * Ensures compiled assets are available at both apps/web/dist and root dist.
 * This guarantees that Netlify successfully finds the publish directory
 * regardless of whether the UI is configured with 'apps/web/dist' or 'dist'.
 */
const fs = require('fs');
const path = require('path');

const webDist = path.resolve(__dirname, '../dist');
const rootDist = path.resolve(__dirname, '../../../dist');

if (fs.existsSync(webDist)) {
  if (!fs.existsSync(rootDist)) {
    fs.mkdirSync(rootDist, { recursive: true });
  }
  fs.cpSync(webDist, rootDist, { recursive: true, force: true });
  console.log(`[sync-dist] Synced build output from ${webDist} to ${rootDist}`);
}
