
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const db = require('../db');

// Supabase Storage configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'lobby-slides';

// ============================================================
// Helpers
// ============================================================

function getPublicImageUrl(imagePath) {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(imagePath);

  return data.publicUrl;
}

function formatSlide(slide) {
  return {
    ...slide,
    image_url: getPublicImageUrl(slide.image_path)
  };
}

function isValidDate(value) {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isNaN(Date.parse(value))
  );
}

function parseNullableDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  return new Date(value).toISOString();
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined) return defaultValue;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;

  return null;
}

// ============================================================
// GET /lobby-slides
// Retrieve all slides for staff management
// ============================================================

const getLobbySlides = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM public.lobby_slides
      ORDER BY display_order ASC, created_at DESC
    `);

    res.json({
      slides: result.rows.map(formatSlide)
    });

  } catch (error) {
    console.error('Error retrieving lobby slides:', error);

    res.status(500).json({
      error: 'Failed to retrieve lobby slides.'
    });
  }
};


// ============================================================
// GET /lobby-slides/display
// Public endpoint used by the Roku
// ============================================================

const getDisplaySlides = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        title,
        description,
        image_path,
        display_order,
        duration_seconds
      FROM public.lobby_slides
      WHERE active = TRUE
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at > NOW())
      ORDER BY display_order ASC, created_at ASC
    `);

    res.set('Cache-Control', 'public, max-age=60');

    res.json({
      slides: result.rows.map(formatSlide)
    });

  } catch (error) {
    console.error('Error retrieving Roku slides:', error);

    res.status(500).json({
      error: 'Failed to retrieve slideshow content.'
    });
  }
};


// ============================================================
// POST /lobby-slides
// Upload an image and create a slide
// ============================================================

const createLobbySlide = async (req, res) => {
  let uploadedPath = null;

  try {
    const {
      title,
      description,
      active,
      starts_at,
      ends_at,
      display_order,
      duration_seconds
    } = req.body;

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'An image file is required.'
      });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        error: 'A slide title is required.'
      });
    }

    if (!isValidDate(starts_at) || !isValidDate(ends_at)) {
      return res.status(400).json({
        error: 'Invalid scheduling date.'
      });
    }

    const startDate = parseNullableDate(starts_at);
    const endDate = parseNullableDate(ends_at);

    if (
      startDate &&
      endDate &&
      new Date(endDate) <= new Date(startDate)
    ) {
      return res.status(400).json({
        error: 'The end date must be after the start date.'
      });
    }

    const order = display_order === undefined
      ? 0
      : Number(display_order);

    const duration = duration_seconds === undefined
      ? 15
      : Number(duration_seconds);

    const isActive = parseBoolean(active);

    if (isActive === null) {
      return res.status(400).json({
        error: 'Active must be true or false.'
      });
    }

    if (!Number.isInteger(order)) {
      return res.status(400).json({
        error: 'Display order must be a whole number.'
      });
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
      return res.status(400).json({
        error: 'Slide duration must be between 1 and 300 seconds.'
      });
    }

    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };

    const extension = extensionMap[file.mimetype];

    if (!extension) {
      return res.status(400).json({
        error: 'Unsupported image format.'
      });
    }

    // Generate a unique filename.
    const filename = `${crypto.randomUUID()}.${extension}`;

    uploadedPath = filename;

    // Upload image to Supabase Storage.
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase image upload error:', uploadError);
      throw new Error('Image upload failed.');
    }

    // Create database record.
    const result = await db.query(
      `
        INSERT INTO public.lobby_slides (
          title,
          description,
          image_path,
          active,
          starts_at,
          ends_at,
          display_order,
          duration_seconds
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        title.trim(),
        description || null,
        filename,
        isActive,
        startDate || null,
        endDate || null,
        order,
        duration
      ]
    );

    res.status(201).json({
      message: 'Lobby slide created successfully.',
      slide: formatSlide(result.rows[0])
    });

  } catch (error) {
    console.error('Error creating lobby slide:', error);

    // Remove uploaded image if the database insert failed.
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from(BUCKET)
        .remove([uploadedPath]);

      if (cleanupError) {
        console.error('Could not clean up uploaded image:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Failed to create lobby slide.'
    });
  }
};


// ============================================================
// PUT /lobby-slides/:id
// Update slide information and settings
// ============================================================

const updateLobbySlide = async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = {
      title: 'title',
      description: 'description',
      active: 'active',
      starts_at: 'starts_at',
      ends_at: 'ends_at',
      display_order: 'display_order',
      duration_seconds: 'duration_seconds'
    };

    const updates = [];
    const values = [];

    for (const [field, column] of Object.entries(allowedFields)) {
      if (req.body[field] === undefined) continue;

      let value = req.body[field];

      if (field === 'title') {
        if (typeof value !== 'string' || !value.trim()) {
          return res.status(400).json({
            error: 'Slide title cannot be empty.'
          });
        }

        value = value.trim();
      }

      if (field === 'active') {
        value = parseBoolean(value, null);

        if (value === null) {
          return res.status(400).json({
            error: 'Active must be true or false.'
          });
        }
      }

      if (field === 'starts_at' || field === 'ends_at') {
        if (!isValidDate(value)) {
          return res.status(400).json({
            error: 'Invalid scheduling date.'
          });
        }

        value = parseNullableDate(value);
      }

      if (field === 'display_order') {
        value = Number(value);

        if (!Number.isInteger(value)) {
          return res.status(400).json({
            error: 'Display order must be a whole number.'
          });
        }
      }

      if (field === 'duration_seconds') {
        value = Number(value);

        if (!Number.isInteger(value) || value < 1 || value > 300) {
          return res.status(400).json({
            error: 'Slide duration must be between 1 and 300 seconds.'
          });
        }
      }

      values.push(value);
      updates.push(`${column} = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No valid fields provided for update.'
      });
    }

    updates.push('updated_at = NOW()');

    // Retrieve current schedule for validation.
    const current = await db.query(
      `
        SELECT starts_at, ends_at
        FROM public.lobby_slides
        WHERE id = $1
      `,
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Lobby slide not found.'
      });
    }

    const finalStart = req.body.starts_at === undefined
      ? current.rows[0].starts_at
      : parseNullableDate(req.body.starts_at);

    const finalEnd = req.body.ends_at === undefined
      ? current.rows[0].ends_at
      : parseNullableDate(req.body.ends_at);

    if (
      finalStart &&
      finalEnd &&
      new Date(finalEnd) <= new Date(finalStart)
    ) {
      return res.status(400).json({
        error: 'The end date must be after the start date.'
      });
    }

    values.push(id);

    const result = await db.query(
      `
        UPDATE public.lobby_slides
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `,
      values
    );

    res.json({
      message: 'Lobby slide updated successfully.',
      slide: formatSlide(result.rows[0])
    });

  } catch (error) {
    console.error('Error updating lobby slide:', error);

    res.status(500).json({
      error: 'Failed to update lobby slide.'
    });
  }
};


// ============================================================
// DELETE /lobby-slides/:id
// Delete database record and associated image
// ============================================================

const deleteLobbySlide = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
        SELECT image_path
        FROM public.lobby_slides
        WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Lobby slide not found.'
      });
    }

    const imagePath = result.rows[0].image_path;

    // Remove image from Supabase Storage.
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([imagePath]);

    if (storageError) {
      console.error('Supabase image deletion error:', storageError);

      return res.status(500).json({
        error: 'Could not delete the slide image.'
      });
    }

    // Remove database record.
    await db.query(
      `
        DELETE FROM public.lobby_slides
        WHERE id = $1
      `,
      [id]
    );

    res.json({
      message: 'Lobby slide deleted successfully.'
    });

  } catch (error) {
    console.error('Error deleting lobby slide:', error);

    res.status(500).json({
      error: 'Failed to delete lobby slide.'
    });
  }
};


// ============================================================
// Exports
// ============================================================

module.exports = {
  getLobbySlides,
  getDisplaySlides,
  createLobbySlide,
  updateLobbySlide,
  deleteLobbySlide
};