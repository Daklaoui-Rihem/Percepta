// scripts/batchIngest.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Analysis = require('../models/Analysis');
const { addAnalysisJob } = require('../queue');

const FOLDER = process.argv.slice(2).join(' ');
const CONCURRENCY = 3;
const SUPPORTED = ['.mp3', '.wav', '.m4a', '.ogg', '.mpeg'];
const LOG_FILE = path.join(__dirname, 'batch_run.log');

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

async function run() {
  if (!FOLDER) {
    log('ERROR: No folder path provided. Usage: node scripts/batchIngest.js <folder>');
    process.exit(1);
  }
  if (!fs.existsSync(FOLDER)) {
    log(`ERROR: Folder not found: ${FOLDER}`);
    process.exit(1);
  }

  log(`Connecting to MongoDB...`);
  await mongoose.connect(process.env.MONGO_URI);
  log(`Connected. Scanning folder: ${FOLDER}`);
  
  const files = fs.readdirSync(FOLDER)
    .filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()))
    .map(f => path.join(FOLDER, f));

  log(`Found ${files.length} audio files`);

  let done = 0, skipped = 0, errors = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (filePath) => {
      const name = path.basename(filePath);
      try {
        const exists = await Analysis.findOne({ originalName: name });
        if (exists) { skipped++; log(`Skipped (already in DB): ${name}`); return; }

        const stat = fs.statSync(filePath);
        const analysis = await Analysis.create({
          userId: process.env.BATCH_USER_ID,
          originalName: name,
          filename: name,
          mimetype: 'audio/mpeg',
          size: stat.size,
          type: 'audio',
          status: 'pending',
          filePath,
        });

        await addAnalysisJob(String(analysis._id), 'audio', filePath);
        done++;
        log(`Queued: ${name}`);
      } catch (err) {
        errors.push({ file: name, error: err.message });
        log(`ERROR: ${name} — ${err.message}`);
      }
    }));

    log(`Progress: ${Math.min(i + CONCURRENCY, files.length)} / ${files.length}`);
  }

  log(`Finished — Done: ${done}, Skipped: ${skipped}, Errors: ${errors.length}`);
  if (errors.length) {
    const errFile = path.join(__dirname, 'batch_errors.json');
    fs.writeFileSync(errFile, JSON.stringify(errors, null, 2));
    log(`Error details saved to: ${errFile}`);
  }
  
  await mongoose.disconnect();
  log('Disconnected.');
}

run().catch(err => {
  fs.appendFileSync(LOG_FILE, `[FATAL] ${err.message}\n${err.stack}\n`);
  console.error('[FATAL]', err.message);
  process.exit(1);
});