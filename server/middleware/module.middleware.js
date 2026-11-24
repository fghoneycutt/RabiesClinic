const db = require('../db');

const {
  FORM_MODULES
} = require('../utils/forms/forms.constants');
// ==========================================
// SHARED MODULE ACCESS CHECK
// ==========================================

async function hasModuleAccess(organizationId, moduleKey) {
  const result = await db.query(
    `
    SELECT 1
    FROM organization_modules
    WHERE organization_id = $1
      AND module_key = $2
      AND enabled = TRUE
    LIMIT 1
    `,
    [organizationId, moduleKey]
  );

  return result.rows.length > 0;
}

// ==========================================
// STATIC MODULE ACCESS
// Used by routes such as Rabies Clinics.
// ==========================================

function requireModule(moduleKey) {
  return async (req, res, next) => {
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

    // Platform administrators bypass module enablement.
    if (req.user.platform_role === 'platform_admin') {
      return next();
    }

    try {
      const enabled = await hasModuleAccess(
        req.organizationId,
        moduleKey
      );

      if (!enabled) {
        return res.status(403).json({
          message: 'This module is not enabled for your organization.'
        });
      }

      return next();
    } catch (err) {
      console.error('Module access check error:', err);

      return res.status(500).json({
        message: 'Unable to verify module access.'
      });
    }
  };
}

// ==========================================
// DYNAMIC FORM MODULE ACCESS
// ==========================================

// Check access using a form type.
async function checkFormModuleAccess(
  req,
  res,
  formType,
  organizationId
) {
  const moduleKey = FORM_MODULES[formType];

  if (!moduleKey) {
    res.status(400).json({
      message: 'Invalid or unsupported form type.'
    });

    return false;
  }

  if (!organizationId) {
    res.status(400).json({
      message: 'Organization context is required.'
    });

    return false;
  }

  // Platform administrators bypass module enablement.
  if (req.user?.platform_role === 'platform_admin') {
    return true;
  }

  const enabled = await hasModuleAccess(
    organizationId,
    moduleKey
  );

  if (!enabled) {
    res.status(403).json({
      message: 'This form module is not enabled for your organization.'
    });

    return false;
  }

  return true;
}

// ==========================================
// CREATE FORM ACCESS
// Determines module from req.body.form_type.
// ==========================================

function requireFormModuleFromBody(req, res, next) {
  return (async () => {
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

    // Match the createForm controller's default.
    const formType = req.body?.form_type || 'general';

    try {
      const allowed = await checkFormModuleAccess(
        req,
        res,
        formType,
        req.organizationId
      );

      if (!allowed) return;

      req.formType = formType;
      req.formModuleKey = FORM_MODULES[formType];

      return next();
    } catch (err) {
      console.error('Create form module access error:', err);

      return res.status(500).json({
        message: 'Unable to verify form module access.'
      });
    }
  })();
}

// ==========================================
// EXISTING FORM ACCESS
// Determines module from forms.id.
// ==========================================

function requireFormModuleFromFormId(req, res, next) {
  return (async () => {
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

    try {
      const result = await db.query(
        `
        SELECT
          id,
          organization_id,
          form_type
        FROM forms
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1
        `,
        [req.params.id, req.organizationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Form not found.'
        });
      }

      const form = result.rows[0];

      const allowed = await checkFormModuleAccess(
        req,
        res,
        form.form_type,
        form.organization_id
      );

      if (!allowed) return;

      req.formAccess = form;
      req.formType = form.form_type;
      req.formModuleKey = FORM_MODULES[form.form_type];

      return next();
    } catch (err) {
      console.error('Form module access error:', err);

      return res.status(500).json({
        message: 'Unable to verify form access.'
      });
    }
  })();
}

// ==========================================
// EXISTING SUBMISSION ACCESS
// Determines module from associated form.
// ==========================================

function requireFormModuleFromSubmissionId(req, res, next) {
  return (async () => {
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

    try {
      const result = await db.query(
        `
        SELECT
          fs.id AS submission_id,
          fs.organization_id,
          fs.form_id,
          f.form_type
        FROM form_submissions fs
        INNER JOIN forms f
          ON f.id = fs.form_id
         AND f.organization_id = fs.organization_id
        WHERE fs.id = $1
          AND fs.organization_id = $2
        LIMIT 1
        `,
        [req.params.id, req.organizationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Submission not found.'
        });
      }

      const submission = result.rows[0];

      const allowed = await checkFormModuleAccess(
        req,
        res,
        submission.form_type,
        submission.organization_id
      );

      if (!allowed) return;

      req.submissionAccess = submission;
      req.formType = submission.form_type;
      req.formModuleKey = FORM_MODULES[submission.form_type];

      return next();
    } catch (err) {
      console.error('Submission module access error:', err);

      return res.status(500).json({
        message: 'Unable to verify submission access.'
      });
    }
  })();
}

// ==========================================
// PUBLIC FORM ACCESS
// Determines module from public form slug.
// No authentication required.
// ==========================================

function requirePublicFormModuleFromSlug(req, res, next) {
  return (async () => {
    try {
      const result = await db.query(
        `
        SELECT
          id,
          organization_id,
          form_type
        FROM forms
        WHERE slug = $1
        LIMIT 1
        `,
        [req.params.slug]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Form not found.'
        });
      }

      const form = result.rows[0];
      const moduleKey = FORM_MODULES[form.form_type];

      if (!moduleKey) {
        return res.status(400).json({
          message: 'This form has an invalid form type.'
        });
      }

      const enabled = await hasModuleAccess(
        form.organization_id,
        moduleKey
      );

      if (!enabled) {
        return res.status(404).json({
          message: 'This form is not currently available.'
        });
      }

      req.formAccess = form;
      req.formType = form.form_type;
      req.formModuleKey = moduleKey;

      return next();
    } catch (err) {
      console.error('Public form module access error:', err);

      return res.status(500).json({
        message: 'Unable to verify public form availability.'
      });
    }
  })();
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  requireModule,
  requireFormModuleFromBody,
  requireFormModuleFromFormId,
  requireFormModuleFromSubmissionId,
  requirePublicFormModuleFromSlug,
  FORM_MODULES
};