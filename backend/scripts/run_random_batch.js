/**
 * run_random_batch.js
 * -------------------
 * Direct terminal script to enqueue 100 random videos.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// FIX: Point specifically to the .env file in the backend folder
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Analysis = require('../models/Analysis');
const { addAnalysisJob } = require('../queue');

// Hardcoded User ID as requested
const BATCH_USER_ID = "69adabc6a1ab039a1e21f156";

function getVideos(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getVideos(filePath, fileList);
    } else {
      if (['.mp4', '.avi', '.mov', '.mkv', '.wmv'].includes(path.extname(file).toLowerCase())) {
        fileList.push(filePath);
      }
    }
  });
  return fileList;
}

async function start() {
  const sourceFolder = process.argv[2];
  if (!sourceFolder) {
    console.error("❌ Please provide a folder path.");
    process.exit(1);
  }

  // Ensure we use the exact URI from .env
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI not found in .env. Check if backend/.env exists.");
    process.exit(1);
  }

  console.log(`🔌 Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  console.log(`🔍 Scanning for videos in: ${sourceFolder}`);
  const allVideos = getVideos(sourceFolder);
  
  if (allVideos.length === 0) {
    console.error("❌ No videos found.");
    process.exit(1);
  }

  const selected = allVideos.sort(() => 0.5 - Math.random()).slice(0, 100);
  console.log(`🎲 Selected ${selected.length} random videos. Enqueuing...`);

  for (let i = 0; i < selected.length; i++) {
    const filePath = path.resolve(selected[i]); // Use absolute paths
    const name = path.basename(filePath);
    const stats = fs.statSync(filePath);

    try {
      const analysis = await Analysis.create({
        userId: BATCH_USER_ID,
        originalName: name,
        filename: name,
        mimetype: 'video/mp4',
        size: stats.size,
        type: 'video',
        status: 'pending',
        filePath: filePath,
      });

      await addAnalysisJob(String(analysis._id), 'video', filePath);
      console.log(`✅ [${i+1}/${selected.length}] Enqueued: ${name}`);
    } catch (err) {
      console.error(`❌ Failed ${name}:`, err.message);
    }
  }

  console.log("\n🚀 Done! The worker should now start processing them.");
  process.exit(0);
}

start().catch(err => {
  console.error("💥 Fatal Error:", err);
  process.exit(1);
});
