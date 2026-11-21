
const { verifyToken } = require('../auth/jwt');
const db = require('../db');

// -----------------------------
// AUTHENTICATION
// -----------------------------
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Missing token'
    });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }
}

// -----------------------------
// ORGANIZATION CONTEXT
// -----------------------------
async function resolveOrganizationContext(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthenticated'
    });
  }

  const requestedOrganizationId = req.get('X-Organization-Id');

  // ---------------------------------
  // REGULAR USERS
  // ---------------------------------
  // Regular users are always restricted
  // to their assigned organization.
  if (req.user.platform_role !== 'platform_admin') {
    if (
      requestedOrganizationId &&
      requestedOrganizationId !== req.user.organization_id
    ) {
      return res.status(403).json({
        message: 'You cannot access another organization.'
      });
    }

    if (!req.user.organization_id) {
      return res.status(403).json({
        message: 'User is not assigned to an organization.'
      });
    }

    req.organizationId = req.user.organization_id;
    return next();
  }

  // ---------------------------------
  // PLATFORM ADMINISTRATORS
  // ---------------------------------
  // No selected organization means
  // platform-wide administration mode.
  if (!requestedOrganizationId) {
    req.organizationId = null;
    return next();
  }

  // Validate UUID format before querying PostgreSQL.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(requestedOrganizationId)) {
    return res.status(400).json({
      message: 'Invalid organization ID.'
    });
  }

  try {
    const result = await db.query(
      `
        SELECT id
        FROM organizations
        WHERE id = $1
      `,
      [requestedOrganizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Organization not found.'
      });
    }

    req.organizationId = result.rows[0].id;
    return next();

  } catch (err) {
    console.error('ORGANIZATION CONTEXT ERROR:', err);

    return res.status(500).json({
      message: 'Unable to resolve organization context.'
    });
  }
}

// -----------------------------
// REQUIRE ORGANIZATION CONTEXT
// -----------------------------
// Apply this to routes that require
// an active organization.
function requireOrganizationContext(req, res, next) {
  if (!req.organizationId) {
    return res.status(400).json({
      message: 'Select an organization before accessing this resource.'
    });
  }

  next();
}

// -----------------------------
// GENERAL ROLE CHECK
// -----------------------------
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthenticated'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: 'Forbidden'
      });
    }

    next();
  };
}

// -----------------------------
// MULTIPLE ROLE CHECK
// -----------------------------
function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Unauthenticated'
      });
    }

    // Platform administrators can perform
    // organization-level actions when they
    // have selected an organization context.
    if (req.user.platform_role === 'platform_admin') {
      if (!req.organizationId) {
        return res.status(400).json({
          message: 'Select an organization before accessing this resource.'
        });
      }

      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Forbidden'
      });
    }

    next();
  };
}

// -----------------------------
// PLATFORM ADMIN CHECK
// -----------------------------
function requirePlatformAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthenticated'
    });
  }

  if (req.user.platform_role !== 'platform_admin') {
    return res.status(403).json({
      message: 'Platform administrator access required'
    });
  }

  next();
}

// -----------------------------
// ORGANIZATION ADMIN CHECK
// -----------------------------
function requireOrganizationAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      message: 'Unauthenticated'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'Select an organization before accessing this resource.'
    });
  }

  // Platform administrators can administer
  // the selected organization.
  if (req.user.platform_role === 'platform_admin') {
    return next();
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Organization administrator access required'
    });
  }

  if (!req.user.organization_id) {
    return res.status(403).json({
      message: 'User is not assigned to an organization'
    });
  }

  next();
}

// -----------------------------
// EXPORTS
// -----------------------------
module.exports = {
  authenticate,
  resolveOrganizationContext,
  requireOrganizationContext,
  requireRole,
  requireAnyRole,
  requirePlatformAdmin,
  requireOrganizationAdmin
};