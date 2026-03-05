import { Router } from 'express';
import { supabaseAuth, AuthenticatedRequest } from '../middlewares/auth';
import { orchestration } from '../services/orchestration.service';
import { slideBuilder } from '../services/slide-builder.service';
import { templateAnalyser } from '../services/template-analyser.service';
import { aiChat } from '../services/ai-chat.service';
import { supabaseAdmin } from '../lib/supabase';
import env from '../config/env';

const router = Router();

/**
 * @swagger
 * /api/pitchbooks:
 *   post:
 *     summary: Create a new pitch book generation job
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, company, transaction_type, pb_type]
 *             properties:
 *               title: { type: string }
 *               company: { type: string }
 *               ticker: { type: string }
 *               transaction_type: { type: string, enum: [ma, capital_raising, restructuring, ipo, debt_financing] }
 *               pb_type: { type: string, enum: [company_overview, market_update, transaction_summary] }
 *               template_id: { type: string }
 *               additional_context: { type: string }
 *     responses:
 *       201: { description: Pitch book generation started }
 */
router.post('/', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pitchBook = await orchestration.generatePitchBook(req.userId!, req.body);
    res.status(201).json({ success: true, data: pitchBook });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks:
 *   get:
 *     summary: List user's pitch books
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of pitch books }
 */
router.get('/', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('pitch_books')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ success: true, data, total: count, page, limit });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks/{id}:
 *   get:
 *     summary: Get a specific pitch book
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pitch book details }
 */
router.get('/:id', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pitch_books')
      .select('*, generations(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Pitch book not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks/{id}:
 *   put:
 *     summary: Update a pitch book
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pitch_books')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Pitch book not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks/{id}:
 *   delete:
 *     summary: Delete a pitch book
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('pitch_books')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) throw error;
    res.json({ success: true, message: 'Pitch book deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks/{id}/export:
 *   post:
 *     summary: Export pitch book as .pptx
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/export', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: pitchBook, error } = await supabaseAdmin
      .from('pitch_books')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !pitchBook) {
      return res.status(404).json({ success: false, error: 'Pitch book not found' });
    }

    if (pitchBook.file_url) {
      return res.json({ success: true, data: { download_url: pitchBook.file_url } });
    }

    // Regenerate if no file exists
    const templateAnalysis = await templateAnalyser.analyseTemplate(Buffer.from(''), 'default');
    const { buffer } = await slideBuilder.buildPresentation(
      { title: pitchBook.title, narrative_arc: '', slides: pitchBook.slides_data || [] },
      templateAnalysis
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${pitchBook.company}_pitch_book.pptx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks/{id}/chat:
 *   post:
 *     summary: Chat with AI to edit pitch book
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 */
router.post('/:id/chat', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: pitchBook } = await supabaseAdmin
      .from('pitch_books')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!pitchBook) {
      return res.status(404).json({ success: false, error: 'Pitch book not found' });
    }

    // Get chat history
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('pitch_book_id', req.params.id)
      .order('created_at', { ascending: true })
      .limit(50);

    // Save user message
    await supabaseAdmin.from('chat_messages').insert({
      pitch_book_id: req.params.id,
      role: 'user',
      content: req.body.message,
    });

    // Get AI response
    const aiResponse = await aiChat.chat({
      pitchBookId: req.params.id,
      message: req.body.message,
      slidesData: pitchBook.slides_data || [],
      history: (history || []).map(m => ({ role: m.role, content: m.content })),
    });

    // Save AI response
    await supabaseAdmin.from('chat_messages').insert({
      pitch_book_id: req.params.id,
      role: 'assistant',
      content: aiResponse,
    });

    res.json({ success: true, data: { message: aiResponse } });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/pitchbooks/{id}/generation:
 *   get:
 *     summary: Get generation status
 *     tags: [Pitch Books]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/generation', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('generations')
      .select('*')
      .eq('pitch_book_id', req.params.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Generation not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
