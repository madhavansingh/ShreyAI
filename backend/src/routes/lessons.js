/**
 * routes/lessons.js
 * Lesson ingestion, status polling, and lesson retrieval endpoints.
 */

const express = require('express');
const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');
const path    = require('path');
const fs      = require('fs');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router  = express.Router();

const { db, getBucket }                            = require('../config/firebase');
const { authMiddleware, requireInstructor }         = require('../middleware/authMiddleware');

// Local disk directory for uploaded videos
const UPLOADS_DIR = path.join(__dirname, '../../uploads/videos');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const { extractYoutubeId }        = require('../services/transcriptService');
const { runYoutubeIngest, runUploadIngest } = require('../services/ingestOrchestrator');
const { generateTopicSegments }   = require('../services/aiMetaService');

// Multer — store upload in memory (max 500MB per file, streamed to Firebase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB in-memory limit
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'audio/mpeg', 'audio/wav', 'audio/mp4'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type ${file.mimetype} not supported. Use MP4, WebM, MOV, AVI, MP3, or WAV.`));
  },
});

// ── POST /api/lessons/ingest-youtube ─────────────────────────────────────────
router.post('/ingest-youtube', authMiddleware, requireInstructor, async (req, res, next) => {
  try {
    const { courseId, moduleId = 'default', title, description = '', youtubeUrl, order = 0 } = req.body;

    if (!courseId || !title || !youtubeUrl) {
      return res.status(400).json({ success: false, error: 'courseId, title, and youtubeUrl are required.' });
    }

    // Validate YouTube URL
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Invalid YouTube URL. Supported formats: watch?v=, youtu.be/, embed/' });
    }

    // Create lesson document
    const lessonId = uuidv4();
    const lessonData = {
      lessonId,
      courseId,
      moduleId,
      title,
      description,
      order,
      source:       'youtube',
      youtubeUrl,
      youtubeVideoId: videoId,
      status:       'processing',
      progress:     0,
      chunkCount:   0,
      duration:     0,
      starterQuestions: [],
      topicSegments:    [],
      createdBy:    req.user.uid,
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
      error:        null,
    };

    await db.collection('lessons').doc(lessonId).set(lessonData);

    // 🔥 Fire-and-forget background pipeline (no await)
    setImmediate(() => runYoutubeIngest(lessonId, youtubeUrl, title));

    res.status(201).json({
      success:  true,
      lessonId,
      status:   'processing',
      message:  'Lesson created. Processing has started in the background.',
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/lessons/upload ──────────────────────────────────────────────────
router.post('/upload', authMiddleware, requireInstructor, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { courseId, moduleId = 'default', title, description = '', order = 0, language = 'auto' } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({ success: false, error: 'courseId and title are required.' });
    }

    const lessonId    = uuidv4();
    const ext         = req.file.originalname.split('.').pop().toLowerCase();
    const localFile   = path.join(UPLOADS_DIR, `${lessonId}.${ext}`);
    const storagePath = `local:${lessonId}.${ext}`;  // marker for local disk

    // Create lesson document immediately so frontend can poll
    const lessonData = {
      lessonId,
      courseId,
      moduleId,
      title,
      description,
      order,
      source:     'upload',
      storagePath,
      status:     'uploading',
      progress:   1,
      chunkCount: 0,
      duration:   0,
      starterQuestions: [],
      topicSegments:    [],
      createdBy:  req.user.uid,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      error:      null,
    };

    await db.collection('lessons').doc(lessonId).set(lessonData);

    // Respond immediately — everything below runs in background
    res.status(201).json({
      success:  true,
      lessonId,
      status:   'uploading',
      message:  'Lesson created. Uploading and processing in background.',
    });

    // 🔥 Background pipeline
    const fileBuffer = req.file.buffer;
    const fileMime   = req.file.mimetype;
    const fileName   = req.file.originalname;

    setImmediate(async () => {
      try {
        // ── Phase A: Save video to Cloudinary (persistent across deployments) ──
        console.log(`\n📤 Uploading ${fileName} to Cloudinary...`);
        let videoUrl = null;
        try {
          const cloudinaryUrl = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_chunked_stream(
              { resource_type: 'video', folder: 'kodr-aura/videos', public_id: lessonId },
              (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
              }
            );
            streamifier.createReadStream(fileBuffer).pipe(uploadStream);
          });
          
          videoUrl = cloudinaryUrl;
          console.log(`   ✅ Cloudinary upload done → ${videoUrl}`);

          // Persist videoUrl so frontend can play directly
          await db.collection('lessons').doc(lessonId).update({
            videoUrl,
            storagePath: `cloudinary:${lessonId}`,
            updatedAt: new Date().toISOString(),
          });
        } catch (storageErr) {
          // Storage upload failed — fall back to local disk (dev only)
          console.warn(`⚠️  Cloudinary upload failed, falling back to local disk:`, storageErr.message);
          await fs.promises.writeFile(localFile, fileBuffer);
          console.log(`   💾 Video saved locally → ${localFile}`);
        }

        // ── Phase B: Transcribe + AI pipeline ──────────────────────────────
        await runUploadIngest(lessonId, fileBuffer, fileMime, fileName, language, title);
      } catch (err) {
        console.error('❌ Upload background error:', err.message);
        await db.collection('lessons').doc(lessonId).update({
          status:    'failed',
          error:     err.message,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/lessons/:lessonId/status ─────────────────────────────────────────
router.get('/:lessonId/status', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const doc = await db.collection('lessons').doc(lessonId).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Lesson not found.' });
    }

    const data = doc.data();
    res.json({
      success:    true,
      lessonId,
      status:     data.status,
      progress:   data.progress || 0,
      chunkCount: data.chunkCount || 0,
      error:      data.error || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/lessons/:lessonId/video ──────────────────────────────────────────
// In production: lessons with videoUrl (Firebase Storage) redirect there directly.
// In dev: streams from local disk with full Range-request support for seeking.
router.get('/:lessonId/video', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const doc = await db.collection('lessons').doc(lessonId).get();

    if (!doc.exists) return res.status(404).json({ error: 'Lesson not found.' });

    const data = doc.data();

    // ── 1. Firebase Storage URL available — redirect (production path) ─────────
    if (data.videoUrl) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.redirect(302, data.videoUrl);
    }

    // ── 2. Local disk fallback (dev / legacy) ─────────────────────────────────
    if (!data.storagePath || !data.storagePath.startsWith('local:')) {
      return res.status(404).json({ error: 'No video file for this lesson.' });
    }

    const fileName    = data.storagePath.replace(/^local:/, '');
    const filePath    = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found on server.' });
    }

    const stat        = fs.statSync(filePath);
    const fileSize    = stat.size;
    const ext         = path.extname(fileName).slice(1).toLowerCase();
    const contentType = ext === 'webm' ? 'video/webm'
                      : ext === 'mov'  ? 'video/quicktime'
                      : ext === 'avi'  ? 'video/x-msvideo'
                      : 'video/mp4';

    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const parts     = rangeHeader.replace(/bytes=/, '').split('-');
      const start     = parseInt(parts[0], 10);
      const end       = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024, fileSize - 1);
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   contentType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type':   contentType,
        'Accept-Ranges':  'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('❌ /video endpoint error:', err.message);
    next(err);
  }
});




// ── GET /api/lessons/:lessonId ────────────────────────────────────────────────
router.get('/:lessonId', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const doc = await db.collection('lessons').doc(lessonId).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Lesson not found.' });
    }

    // Don't return raw chunks — just the lesson metadata
    const data = doc.data();
    const { embedding, ...safeData } = data; // strip any accidental embedding field

    res.json({ success: true, lesson: safeData });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/lessons (list by courseId) ───────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId query param required.' });
    }

    const snapshot = await db
      .collection('lessons')
      .where('courseId', '==', courseId)
      .orderBy('order', 'asc')
      .get();

    const lessons = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id:               d.lessonId,
        lessonId:         d.lessonId,
        title:            d.title,
        description:      d.description,
        order:            d.order,
        source:           d.source,
        status:           d.status,
        duration:         d.duration,
        chunkCount:       d.chunkCount,
        youtubeUrl:       d.youtubeUrl,
        youtubeVideoId:   d.youtubeVideoId,
        videoUrl:         d.videoUrl || null,   // for uploaded lessons
        starterQuestions: d.starterQuestions || [],
        topicSegments:    d.topicSegments || [],
        createdAt:        d.createdAt,
      };
    });

    res.json({ success: true, lessons });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/lessons/:lessonId/regenerate-chapters ──────────────────────────
// Re-runs AI chapter generation on existing chunks — no re-upload required.
router.post('/:lessonId/regenerate-chapters', authMiddleware, async (req, res, next) => {
  const { lessonId } = req.params;
  try {
    // 1. Load existing chunks from Firestore
    const chunksSnap = await db
      .collection('lessons').doc(lessonId)
      .collection('chunks')
      .orderBy('startTime', 'asc')
      .get();

    if (chunksSnap.empty) {
      return res.status(400).json({ error: 'No transcript chunks found. Process the video first.' });
    }

    const chunks = chunksSnap.docs.map(d => d.data());
    console.log(`🔄 Regenerating chapters for ${lessonId} — ${chunks.length} chunks`);

    // 2. Re-run AI segmentation with the improved prompt
    const topicSegments = await generateTopicSegments(chunks);
    console.log(`   ✅ Generated ${topicSegments.length} topic segments`);

    // 3. Save back to Firestore
    await db.collection('lessons').doc(lessonId).update({
      topicSegments,
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, count: topicSegments.length, topicSegments });
  } catch (err) {
    console.error('❌ regenerate-chapters error:', err.message);
    next(err);
  }
});


// ── GET /api/lessons/:lessonId/transcript ─────────────────────────────────────
// Returns ordered transcript chunks with startTime/endTime for subtitle sync.
// Lightweight — only returns text + timing, no embeddings.
router.get('/:lessonId/transcript', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId } = req.params;

    // Use chunk cache for fast repeated reads
    const { getChunks } = require('../services/chunkCache');
    const allChunks = await getChunks(lessonId);

    if (!allChunks || allChunks.length === 0) {
      return res.json({
        success: true,
        chunks:  [],
        message: 'No transcript available yet.',
      });
    }

    // Strip heavy fields, return only what the subtitle engine needs
    const lightweight = allChunks.map(c => ({
      chunkIndex: c.chunkIndex,
      text:       c.text,
      startTime:  c.startTime,
      endTime:    c.endTime,
      startLabel: c.startLabel,
      endLabel:   c.endLabel,
    }));

    res.json({ success: true, chunks: lightweight, total: lightweight.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

