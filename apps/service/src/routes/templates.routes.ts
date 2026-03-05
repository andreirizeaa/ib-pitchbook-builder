import { Router } from 'express';
import multer from 'multer';
import { supabaseAuth, AuthenticatedRequest } from '../middlewares/auth';
import { templateAnalyser } from '../services/template-analyser.service';
import { supabaseAdmin } from '../lib/supabase';
import { v4 as uuid } from 'uuid';
import env from '../config/env';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * @swagger
 * /api/templates/analyze:
 *   post:
 *     summary: Upload and analyse a .pptx template
 *     tags: [Templates]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               name: { type: string }
 */
router.post('/analyze', supabaseAuth, upload.single('file'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const templateId = uuid();
    const fileName = `templates/${req.userId}/${templateId}/${req.file.originalname}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(env.STORAGE_BUCKET)
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error('[Templates] Upload error:', uploadError);
    }

    const { data: urlData } = supabaseAdmin.storage.from(env.STORAGE_BUCKET).getPublicUrl(fileName);

    // Analyse the template
    const analysis = await templateAnalyser.analyseTemplate(req.file.buffer, req.file.originalname);

    // Save template record
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .insert({
        id: templateId,
        user_id: req.userId,
        name: req.body.name || req.file.originalname,
        file_url: urlData.publicUrl,
        analysis_data: analysis,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: List user's templates
 *     tags: [Templates]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('templates')
      .select('id, name, file_url, created_at')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
