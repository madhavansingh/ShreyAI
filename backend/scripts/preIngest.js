/**
 * scripts/preIngest.js
 * Pre-ingest 10 demo YouTube videos before the hackathon presentation.
 *
 * Run ONCE before demo:
 *   node scripts/preIngest.js
 *
 * This creates lesson docs in Firestore, runs the full pipeline, and marks them "ready".
 * You will need a valid courseId in Firestore first — update DEMO_COURSE_ID below.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { db } = require('../src/config/firebase');
const { runYoutubeIngest } = require('../src/services/ingestOrchestrator');
const { v4: uuidv4 } = require('uuid');

// ── Configure these before running ────────────────────────────────────────────
const DEMO_COURSE_ID  = process.env.DEMO_COURSE_ID || 'demo-course-001';
const DEMO_MODULE_ID  = 'module-1';
const CREATED_BY      = 'system-preingest';

// ── 10 Demo Videos ────────────────────────────────────────────────────────────
const DEMO_VIDEOS = [
  {
    title:       'Introduction to Machine Learning',
    description: 'A beginner-friendly overview of ML concepts and applications.',
    youtubeUrl:  'https://www.youtube.com/watch?v=ukzFI9rgwfU',
    order: 1,
  },
  {
    title:       'Python for Beginners - Full Tutorial',
    description: 'Learn Python programming from scratch.',
    youtubeUrl:  'https://www.youtube.com/watch?v=rfscVS0vtbw',
    order: 2,
  },
  {
    title:       'What is Deep Learning?',
    description: 'Understanding neural networks and deep learning.',
    youtubeUrl:  'https://www.youtube.com/watch?v=6M5VXKLf4D4',
    order: 3,
  },
  {
    title:       'How the Internet Works',
    description: 'Networking fundamentals explained visually.',
    youtubeUrl:  'https://www.youtube.com/watch?v=x3c1ih2NJEg',
    order: 4,
  },
  {
    title:       'SQL Tutorial for Beginners',
    description: 'Learn SQL queries and database fundamentals.',
    youtubeUrl:  'https://www.youtube.com/watch?v=HXV3zeQKqGY',
    order: 5,
  },
  {
    title:       'JavaScript Crash Course',
    description: 'Modern JavaScript from zero to hero.',
    youtubeUrl:  'https://www.youtube.com/watch?v=hdI2bqOjy3c',
    order: 6,
  },
  {
    title:       'React JS Tutorial for Beginners',
    description: 'Build web apps with React.',
    youtubeUrl:  'https://www.youtube.com/watch?v=w7ejDZ8SWv8',
    order: 7,
  },
  {
    title:       'Data Structures Easy to Advanced',
    description: 'Complete data structures course.',
    youtubeUrl:  'https://www.youtube.com/watch?v=RBSGKlAvoiM',
    order: 8,
  },
  {
    title:       'Operating System Concepts',
    description: 'Core OS concepts: processes, memory, and scheduling.',
    youtubeUrl:  'https://www.youtube.com/watch?v=26QPDBe-NB8',
    order: 9,
  },
  {
    title:       'Git and GitHub Crash Course',
    description: 'Version control fundamentals every developer needs.',
    youtubeUrl:  'https://www.youtube.com/watch?v=RGOj5yH7evk',
    order: 10,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 SheryAI — Pre-Ingest Script');
  console.log(`   Course ID : ${DEMO_COURSE_ID}`);
  console.log(`   Videos    : ${DEMO_VIDEOS.length}`);
  console.log('─'.repeat(60));

  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < DEMO_VIDEOS.length; i++) {
    const video = DEMO_VIDEOS[i];
    const lessonId = uuidv4();

    console.log(`\n[${i + 1}/${DEMO_VIDEOS.length}] 🎬 ${video.title}`);
    console.log(`   Lesson ID: ${lessonId}`);

    try {
      // Create lesson document
      await db.collection('lessons').doc(lessonId).set({
        lessonId,
        courseId:    DEMO_COURSE_ID,
        moduleId:    DEMO_MODULE_ID,
        title:       video.title,
        description: video.description,
        order:       video.order,
        source:      'youtube',
        youtubeUrl:  video.youtubeUrl,
        status:      'processing',
        progress:    0,
        chunkCount:  0,
        duration:    0,
        starterQuestions: [],
        topicSegments:    [],
        createdBy:   CREATED_BY,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
        error:       null,
      });

      // Run full pipeline synchronously (sequential to avoid rate limits)
      await runYoutubeIngest(lessonId, video.youtubeUrl, video.title);

      // Verify result
      const doc  = await db.collection('lessons').doc(lessonId).get();
      const data = doc.data();

      if (data.status === 'ready') {
        console.log(`   ✅ DONE — ${data.chunkCount} chunks, ${data.starterQuestions?.length || 0} starter questions`);
        successCount++;
      } else {
        console.log(`   ❌ FAILED — ${data.error || 'Unknown error'}`);
        failCount++;
      }
    } catch (err) {
      console.error(`   ❌ EXCEPTION — ${err.message}`);
      failCount++;
    }

    // Brief pause between videos to be respectful to rate limits
    if (i < DEMO_VIDEOS.length - 1) {
      console.log('   ⏳ Waiting 5 seconds before next video...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`📊 Pre-Ingest Complete`);
  console.log(`   ✅ Success : ${successCount}`);
  console.log(`   ❌ Failed  : ${failCount}`);
  console.log(`   Total     : ${DEMO_VIDEOS.length}`);
  console.log('─'.repeat(60) + '\n');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
