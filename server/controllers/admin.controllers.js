
const pool = require('../db');

// ==========================================
// PLATFORM OVERVIEW
// ==========================================
exports.getPlatformOverview = async (req, res) => {
  try {
    const [
      organizationsResult,
      usersResult,
      modulesResult
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE is_active = true) AS active
        FROM organizations
      `),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM users
      `),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM modules
      `)
    ]);

    res.json({
      organizations: {
        total: Number(organizationsResult.rows[0].total),
        active: Number(organizationsResult.rows[0].active)
      },
      users: {
        total: Number(usersResult.rows[0].total)
      },
      modules: {
        total: Number(modulesResult.rows[0].total)
      }
    });

  } catch (err) {
    console.error('Platform overview error:', err);

    res.status(500).json({
      message: 'Failed to load platform overview.'
    });
  }
};


// ==========================================
// GET ALL ORGANIZATIONS
// ==========================================
exports.getOrganizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        o.slug,
        o.is_active,
        o.created_at,
        o.updated_at,

        COUNT(DISTINCT u.id)::int AS user_count,

        COALESCE(
          ARRAY_AGG(DISTINCT om.module_key)
            FILTER (WHERE om.enabled = true),
          ARRAY[]::text[]
        ) AS enabled_modules

      FROM organizations o

      LEFT JOIN users u
        ON u.organization_id = o.id

      LEFT JOIN organization_modules om
        ON om.organization_id = o.id

      GROUP BY o.id

      ORDER BY o.name ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Get organizations error:', err);

    res.status(500).json({
      message: 'Failed to load organizations.'
    });
  }
};


// ==========================================
// GET ALL AVAILABLE MODULES
// ==========================================
exports.getModules = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        key,
        name,
        description
      FROM modules
      ORDER BY name ASC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('Get modules error:', err);

    res.status(500).json({
      message: 'Failed to load modules.'
    });
  }
};


// ==========================================
// CREATE ORGANIZATION
// ==========================================
exports.createOrganization = async (req, res) => {
  const { name, slug, module_keys = [] } = req.body;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof slug !== 'string' ||
    !slug.trim()
  ) {
    return res.status(400).json({
      message: 'Organization name and slug are required.'
    });
  }

  if (!Array.isArray(module_keys)) {
    return res.status(400).json({
      message: 'Module selections must be an array.'
    });
  }

  const normalizedName = name.trim();
  const normalizedSlug = slug.trim().toLowerCase();
  const selectedModules = [...new Set(module_keys)];

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return res.status(400).json({
      message: 'Slug must contain lowercase letters, numbers, and single hyphens only.'
    });
  }

  if (
    selectedModules.some(
      key => typeof key !== 'string' || !key.trim()
    )
  ) {
    return res.status(400).json({
      message: 'One or more module selections are invalid.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify all selected modules exist.
    const modulesResult = await client.query(
      `
      SELECT key
      FROM modules
      WHERE key = ANY($1::text[])
      `,
      [selectedModules]
    );

    if (modulesResult.rows.length !== selectedModules.length) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message: 'One or more selected modules do not exist.'
      });
    }

    const organizationResult = await client.query(
      `
      INSERT INTO organizations (name, slug)
      VALUES ($1, $2)
      RETURNING *
      `,
      [normalizedName, normalizedSlug]
    );

    const organization = organizationResult.rows[0];

    if (selectedModules.length > 0) {
      await client.query(
        `
        INSERT INTO organization_modules (
          organization_id,
          module_key
        )
        SELECT $1, unnest($2::text[])
        `,
        [organization.id, selectedModules]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...organization,
      enabled_modules: selectedModules,
      user_count: 0
    });

  } catch (err) {
    await client.query('ROLLBACK');

    console.error('Create organization error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        message: 'An organization with that slug already exists.'
      });
    }

    res.status(500).json({
      message: 'Failed to create organization.'
    });

  } finally {
    client.release();
  }
};


// ==========================================
// UPDATE ORGANIZATION DETAILS
// ==========================================
exports.updateOrganization = async (req, res) => {
  const { id } = req.params;
  const { name, slug } = req.body;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof slug !== 'string' ||
    !slug.trim()
  ) {
    return res.status(400).json({
      message: 'Organization name and slug are required.'
    });
  }

  const normalizedSlug = slug.trim().toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return res.status(400).json({
      message: 'Slug must contain lowercase letters, numbers, and single hyphens only.'
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE organizations
      SET
        name = $1,
        slug = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [name.trim(), normalizedSlug, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Organization not found.'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Update organization error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        message: 'An organization with that slug already exists.'
      });
    }

    res.status(500).json({
      message: 'Failed to update organization.'
    });
  }
};


// ==========================================
// ACTIVATE / DEACTIVATE ORGANIZATION
// ==========================================
exports.updateOrganizationStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({
      message: 'A valid active status is required.'
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE organizations
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Organization not found.'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Update organization status error:', err);

    res.status(500).json({
      message: 'Failed to update organization status.'
    });
  }
};


// ==========================================
// UPDATE ORGANIZATION MODULES
// ==========================================
exports.updateOrganizationModules = async (req, res) => {
  const { id } = req.params;
  const { module_keys } = req.body;

  if (!Array.isArray(module_keys)) {
    return res.status(400).json({
      message: 'Module selections must be an array.'
    });
  }

  const selectedModules = [...new Set(module_keys)];

  if (
    selectedModules.some(
      key => typeof key !== 'string' || !key.trim()
    )
  ) {
    return res.status(400).json({
      message: 'One or more module selections are invalid.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const organizationResult = await client.query(
      `
      SELECT id
      FROM organizations
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (organizationResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Organization not found.'
      });
    }

    const modulesResult = await client.query(
      `
      SELECT key
      FROM modules
      WHERE key = ANY($1::text[])
      `,
      [selectedModules]
    );

    if (modulesResult.rows.length !== selectedModules.length) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        message: 'One or more selected modules do not exist.'
      });
    }

    await client.query(
      `
      DELETE FROM organization_modules
      WHERE organization_id = $1
      `,
      [id]
    );

    if (selectedModules.length > 0) {
      await client.query(
        `
        INSERT INTO organization_modules (
          organization_id,
          module_key
        )
        SELECT $1, unnest($2::text[])
        `,
        [id, selectedModules]
      );
    }

    await client.query('COMMIT');

    res.json({
      organization_id: id,
      enabled_modules: selectedModules
    });

  } catch (err) {
    await client.query('ROLLBACK');

    console.error('Update organization modules error:', err);

    res.status(500).json({
      message: 'Failed to update organization modules.'
    });

  } finally {
    client.release();
  }
};
