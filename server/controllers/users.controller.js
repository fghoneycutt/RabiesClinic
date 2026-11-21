
const db = require('../db');
const { hashPassword } = require('../auth/password');

// -----------------------------------
// CREATE USER
// -----------------------------------
async function createUser(req, res) {
  const organizationId = req.organizationId;

  const {
    email,
    password,
    role,
    name,
    license_number
  } = req.body;

  try {
    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.'
      });
    }

    const normalizedEmail = email.trim();

    const assignedRole = role || 'staff';

    if (!['admin', 'staff'].includes(assignedRole)) {
      return res.status(400).json({
        message: 'Invalid user role.'
      });
    }

    // Check email uniqueness within this organization.
    const existing = await db.query(
      `
        SELECT id
        FROM users
        WHERE organization_id = $1
          AND LOWER(email) = LOWER($2)
        LIMIT 1
      `,
      [organizationId, normalizedEmail]
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
          name,
          email,
          role,
          license_number,
          created_at
      `,
      [
        organizationId,
        normalizedEmail,
        password_hash,
        assignedRole,
        name || null,
        license_number || null
      ]
    );

    return res.json(result.rows[0]);

  } catch (err) {
    console.error('CREATE USER ERROR:', err);

    // Handles a concurrent duplicate email insertion.
    if (err.code === '23505') {
      return res.status(400).json({
        message: 'Email is already in use by another account.'
      });
    }

    return res.status(500).json({
      message: 'Server error'
    });
  }
}

// -----------------------------------
// LIST USERS
// -----------------------------------
async function listUsers(req, res) {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    const result = await db.query(
      `
        SELECT
          id,
          name,
          email,
          role,
          license_number,
          signature IS NOT NULL AS signature,
          created_at
        FROM users
        WHERE organization_id = $1
          AND platform_role IS DISTINCT FROM 'platform_admin'
        ORDER BY created_at DESC
      `,
      [organizationId]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error('LIST USERS ERROR:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
}

// -----------------------------------
// EDIT USER
// -----------------------------------
async function editUser(req, res) {
  const organizationId = req.organizationId;
  const { id } = req.params;

  const {
    name,
    email,
    role,
    license_number
  } = req.body;

  try {
    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    // Only allow editing ordinary users in this organization.
    const userCheck = await db.query(
      `
        SELECT id
        FROM users
        WHERE id = $1
          AND organization_id = $2
          AND platform_role IS DISTINCT FROM 'platform_admin'
      `,
      [id, organizationId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (role && !['admin', 'staff'].includes(role)) {
      return res.status(400).json({
        message: 'Invalid user role.'
      });
    }

    const normalizedEmail = email
      ? email.trim()
      : null;

    if (normalizedEmail) {
      const emailCheck = await db.query(
        `
          SELECT id
          FROM users
          WHERE organization_id = $1
            AND LOWER(email) = LOWER($2)
            AND id <> $3
          LIMIT 1
        `,
        [
          organizationId,
          normalizedEmail,
          id
        ]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          message: 'Email is already in use by another account'
        });
      }
    }

    const result = await db.query(
      `
        UPDATE users
        SET
          name = COALESCE($1, name),
          email = COALESCE($2, email),
          role = COALESCE($3, role),
          license_number = $4
        WHERE id = $5
          AND organization_id = $6
          AND platform_role IS DISTINCT FROM 'platform_admin'
        RETURNING
          id,
          name,
          email,
          role,
          license_number,
          created_at
      `,
      [
        name,
        normalizedEmail,
        role,
        license_number || null,
        id,
        organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json(result.rows[0]);

  } catch (err) {
    console.error('EDIT USER ERROR:', err);

    if (err.code === '23505') {
      return res.status(400).json({
        message: 'Email is already in use by another account'
      });
    }

    return res.status(500).json({
      message: 'Server error'
    });
  }
}

// -----------------------------------
// RESET PASSWORD
// -----------------------------------
async function resetPassword(req, res) {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;
    const { password } = req.body;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.'
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await db.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
          AND organization_id = $3
          AND platform_role IS DISTINCT FROM 'platform_admin'
        RETURNING id
      `,
      [
        passwordHash,
        id,
        organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json({
      message: 'Password updated successfully.'
    });

  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);

    return res.status(500).json({
      message: 'Failed to reset password.'
    });
  }
}

// -----------------------------------
// UPLOAD SIGNATURE
// -----------------------------------
async function uploadSignature(req, res) {
  const { id } = req.params;

  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'No signature file uploaded.'
      });
    }

    if (
      req.file.mimetype !== 'image/png' &&
      req.file.mimetype !== 'image/jpeg'
    ) {
      return res.status(400).json({
        message: 'Signature must be a PNG or JPEG image.'
      });
    }

    const result = await db.query(
      `
        UPDATE users
        SET signature = $1
        WHERE id = $2
          AND organization_id = $3
          AND platform_role IS DISTINCT FROM 'platform_admin'
        RETURNING id
      `,
      [
        req.file.buffer,
        id,
        organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    return res.json({
      message: 'Signature uploaded successfully.'
    });

  } catch (err) {
    console.error('UPLOAD SIGNATURE ERROR:', err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
}

// -----------------------------------
// GET SIGNATURE
// -----------------------------------
async function getSignature(req, res) {
  try {
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    const result = await db.query(
      `
        SELECT signature
        FROM users
        WHERE id = $1
          AND organization_id = $2
          AND platform_role IS DISTINCT FROM 'platform_admin'
      `,
      [
        req.params.id,
        organizationId
      ]
    );

    if (
      !result.rows.length ||
      !result.rows[0].signature
    ) {
      return res.sendStatus(404);
    }

    const signature = result.rows[0].signature;

    // PNG/JPEG detection.
    if (
      signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47
    ) {
      res.type('png');
    } else {
      res.type('jpeg');
    }

    return res.send(signature);

  } catch (err) {
    console.error('GET SIGNATURE ERROR:', err);

    return res.status(500).json({
      message: 'Failed to retrieve signature'
    });
  }
}

// -----------------------------------
// DELETE USER
// -----------------------------------
async function deleteUser(req, res) {
  try {
    const organizationId = req.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        message: 'Organization context is required.'
      });
    }

    const result = await db.query(
      `
        DELETE FROM users
        WHERE id = $1
          AND organization_id = $2
          AND platform_role IS DISTINCT FROM 'platform_admin'
        RETURNING id, email, name
      `,
      [
        id,
        organizationId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json({
      message: 'User deleted successfully',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('DELETE USER ERROR:', err);

    return res.status(500).json({
      message: 'Failed to delete user'
    });
  }
}

module.exports = {
  createUser,
  listUsers,
  editUser,
  resetPassword,
  uploadSignature,
  getSignature,
  deleteUser
};