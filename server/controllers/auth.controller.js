
const db = require('../db');
const { hashPassword, comparePassword } = require('../auth/password');
const { signToken } = require('../auth/jwt');

// -----------------------------
// GET ENABLED ORGANIZATION MODULES
// -----------------------------
async function getEnabledModules(organizationId) {
  if (!organizationId) {
    return [];
  }

  const result = await db.query(
    `
      SELECT module_key
      FROM organization_modules
      WHERE organization_id = $1
        AND enabled = true
      ORDER BY module_key
    `,
    [organizationId]
  );

  return result.rows.map(row => row.module_key);
}

// -----------------------------
// LOGIN
// -----------------------------
async function login(req, res) {
  const { email, password } = req.body;

  try {
    const result = await db.query(
      `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const enabledModules = await getEnabledModules(user.organization_id);

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        platform_role: user.platform_role,
        enabled_modules: enabledModules
      }
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// -----------------------------
// REGISTER
// -----------------------------
async function register(req, res) {
  const {
    email,
    password,
    role = 'staff',
    name = null,
    license_number = null
  } = req.body;

  try {
    // Require an organization administrator
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Organization administrator access required'
      });
    }

    if (!req.user.organization_id) {
      return res.status(400).json({
        message: 'Administrator account has no organization assigned.'
      });
    }

    // Only allow organization-level roles
    const allowedRoles = ['staff', 'admin'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid user role.'
      });
    }

    // Check existing email across all organizations
    const existing = await db.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    const password_hash = await hashPassword(password);

    const result = await db.query(
      `
        INSERT INTO users (
          organization_id,
          email,
          password_hash,
          role,
          name,
          license_number
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          organization_id,
          email,
          role,
          name,
          license_number
      `,
      [
        req.user.organization_id,
        email,
        password_hash,
        role,
        name,
        license_number
      ]
    );

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// -----------------------------
// CURRENT USER
// -----------------------------
async function me(req, res) {
  try {
    const result = await db.query(
      `
        SELECT
          id,
          email,
          role,
          name,
          organization_id,
          platform_role
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const enabledModules = await getEnabledModules(user.organization_id);

    return res.json({
      ...user,
      enabled_modules: enabledModules
    });

  } catch (err) {
    console.error('ME ERROR:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
}

module.exports = {
  login,
  register,
  me
};