import { Router } from 'express';
import { supabaseAuth, AuthenticatedRequest } from '../middlewares/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getStructureGuidelines } from '../prompts/pitchbook-content.prompt';

const router = Router();

/** Default deck types seeded for new users */
const SYSTEM_DECK_TYPES = [
  { name: 'company_overview', label: 'Company Overview', description: 'Business overview, financials, market position' },
  { name: 'investor_pitch', label: 'Investor Pitch', description: 'Investment thesis, opportunity, returns potential' },
  { name: 'market_update', label: 'Market Update', description: 'Sector trends, M&A activity, outlook' },
  { name: 'transaction_summary', label: 'Transaction Summary', description: 'Deal structure, rationale, analysis' },
  { name: 'industry_overview', label: 'Industry Overview', description: 'Sector landscape, key players, market dynamics' },
  { name: 'fundraising_deck', label: 'Fundraising Deck', description: 'Capital raise story, use of proceeds, projections' },
  { name: 'due_diligence', label: 'Due Diligence', description: 'Deep-dive analysis, risks, financial audit' },
];

/** Parse structure guidelines text into slide objects */
function parseGuidelines(guidelinesText: string): Array<{ slide_index: number; title: string; layout_type: string; description: string }> {
  const lines = guidelinesText.trim().split('\n').filter(l => l.trim());
  return lines.map((line, i) => {
    // Pattern: "1. Title Slide — ..." or "1. Executive Summary — ... (Executive Summary)"
    const match = line.match(/^\d+\.\s*(.+?)(?:\s*—\s*(.+))?$/);
    if (!match) return { slide_index: i, title: line.trim(), layout_type: 'Content Slide', description: '' };

    const titlePart = match[1].trim();
    const descPart = match[2]?.trim() || '';

    // Extract layout type from parentheses at end: "... (Chart Slide)"
    const layoutMatch = descPart.match(/\(([^)]+)\)\s*$/);
    const layout_type = layoutMatch ? layoutMatch[1] : titlePart;
    const description = layoutMatch ? descPart.replace(/\s*\([^)]+\)\s*$/, '') : descPart;

    return { slide_index: i, title: titlePart, layout_type, description };
  });
}

/** Seed default deck types for a user if they have none */
async function seedDefaultsForUser(userId: string) {
  const inserts = SYSTEM_DECK_TYPES.map((dt, i) => ({
    user_id: userId,
    name: dt.name,
    label: dt.label,
    description: dt.description,
    display_order: i,
    is_default: true,
  }));

  const { data: deckTypes, error } = await supabaseAdmin
    .from('custom_deck_types')
    .insert(inserts)
    .select();

  if (error) throw error;

  // Seed slide layouts for each deck type
  for (const dt of deckTypes) {
    const guidelines = getStructureGuidelines(dt.name, '{company}');
    const slides = parseGuidelines(guidelines);
    const slideInserts = slides.map(s => ({ deck_type_id: dt.id, ...s }));
    if (slideInserts.length > 0) {
      await supabaseAdmin.from('deck_type_slides').insert(slideInserts);
    }
  }

  return deckTypes;
}

/**
 * GET /api/deck-types
 * List user's custom deck types (seeds defaults if none exist)
 */
router.get('/', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    let { data, error } = await supabaseAdmin
      .from('custom_deck_types')
      .select('*, deck_type_slides(*)')
      .eq('user_id', req.userId!)
      .order('display_order');

    if (error) throw error;

    // Seed defaults on first access
    if (!data || data.length === 0) {
      const seeded = await seedDefaultsForUser(req.userId!);
      // Re-fetch with slides
      const refetch = await supabaseAdmin
        .from('custom_deck_types')
        .select('*, deck_type_slides(*)')
        .eq('user_id', req.userId!)
        .order('display_order');
      data = refetch.data;
    }

    // Sort slides within each deck type
    for (const dt of data || []) {
      if (dt.deck_type_slides) {
        dt.deck_type_slides.sort((a: any, b: any) => a.slide_index - b.slide_index);
      }
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/deck-types
 * Create a new custom deck type
 */
router.post('/', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, label, description, slides } = req.body;
    if (!name || !label) {
      return res.status(400).json({ success: false, error: 'name and label are required' });
    }

    // Get max display_order
    const { data: existing } = await supabaseAdmin
      .from('custom_deck_types')
      .select('display_order')
      .eq('user_id', req.userId!)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

    const { data: deckType, error } = await supabaseAdmin
      .from('custom_deck_types')
      .insert({
        user_id: req.userId!,
        name,
        label,
        description: description || '',
        display_order: nextOrder,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert slides if provided
    if (slides && Array.isArray(slides) && slides.length > 0) {
      const slideInserts = slides.map((s: any, i: number) => ({
        deck_type_id: deckType.id,
        slide_index: i,
        title: s.title,
        layout_type: s.layout_type || 'Content Slide',
        description: s.description || '',
      }));
      await supabaseAdmin.from('deck_type_slides').insert(slideInserts);
    }

    // Re-fetch with slides
    const { data: full } = await supabaseAdmin
      .from('custom_deck_types')
      .select('*, deck_type_slides(*)')
      .eq('id', deckType.id)
      .single();

    res.status(201).json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/deck-types/:id
 * Update a deck type (label, description, display_order, slides)
 */
router.put('/:id', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { label, description, display_order, slides } = req.body;

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('custom_deck_types')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, error: 'Deck type not found' });
    }

    // Update deck type fields
    const updates: any = {};
    if (label !== undefined) updates.label = label;
    if (description !== undefined) updates.description = description;
    if (display_order !== undefined) updates.display_order = display_order;

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('custom_deck_types').update(updates).eq('id', id);
    }

    // Replace slides if provided
    if (slides && Array.isArray(slides)) {
      // Delete existing slides
      await supabaseAdmin.from('deck_type_slides').delete().eq('deck_type_id', id);
      // Insert new slides
      if (slides.length > 0) {
        const slideInserts = slides.map((s: any, i: number) => ({
          deck_type_id: id,
          slide_index: i,
          title: s.title,
          layout_type: s.layout_type || 'Content Slide',
          description: s.description || '',
        }));
        await supabaseAdmin.from('deck_type_slides').insert(slideInserts);
      }
    }

    // Re-fetch with slides
    const { data: full } = await supabaseAdmin
      .from('custom_deck_types')
      .select('*, deck_type_slides(*)')
      .eq('id', id)
      .single();

    res.json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/deck-types/reorder
 * Reorder deck types
 */
router.put('/reorder/batch', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { order } = req.body; // Array of { id, display_order }
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'order array is required' });
    }

    for (const item of order) {
      await supabaseAdmin
        .from('custom_deck_types')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
        .eq('user_id', req.userId!);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/deck-types/:id
 * Delete a custom deck type
 */
router.delete('/:id', supabaseAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('custom_deck_types')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId!);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
