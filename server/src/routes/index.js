import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';
import * as dashboard from '../controllers/dashboard.controller.js';
import * as beneficiaries from '../controllers/beneficiaries.controller.js';
import * as types from '../controllers/types.controller.js';
import * as requests from '../controllers/requests.controller.js';
import * as attestations from '../controllers/attestations.controller.js';
import * as audit from '../controllers/audit.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as auth from '../controllers/auth.controller.js';
import * as publicCtl from '../controllers/public.controller.js';

const adminOrAgent = requireRoles('administrator', 'administrative_agent');
const adminOnly = requireRoles('administrator');
const archiveReaders = requireRoles(
  'administrator',
  'administrative_agent',
  'external_verifier',
  'beneficiary'
);

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true }));

apiRouter.get('/public/verify/:token', publicCtl.verifyByToken);

apiRouter.post('/auth/login-event', requireAuth, auth.recordLogin);

apiRouter.get('/me', requireAuth, settings.getMe);
apiRouter.patch(
  '/me',
  requireAuth,
  body('fullName').optional().isString().isLength({ max: 200 }),
  handleValidation,
  settings.updateMe
);

apiRouter.patch(
  '/admin/users/role',
  requireAuth,
  adminOnly,
  body('userId').isUUID(),
  body('role').isIn(['administrator', 'administrative_agent', 'beneficiary', 'external_verifier']),
  handleValidation,
  settings.adminSetRole
);

apiRouter.get('/dashboard', requireAuth, dashboard.getDashboard);

apiRouter.get('/beneficiaries', requireAuth, beneficiaries.listBeneficiaries);
apiRouter.post(
  '/beneficiaries',
  requireAuth,
  adminOrAgent,
  body('name').trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('department').optional().isString(),
  body('birthDate').optional().isISO8601(),
  handleValidation,
  beneficiaries.createBeneficiary
);
apiRouter.patch(
  '/beneficiaries/:id',
  requireAuth,
  adminOrAgent,
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('department').optional().isString(),
  body('birthDate').optional().isISO8601(),
  handleValidation,
  beneficiaries.updateBeneficiary
);
apiRouter.delete('/beneficiaries/:id', requireAuth, adminOrAgent, param('id').isUUID(), handleValidation, beneficiaries.deleteBeneficiary);

apiRouter.get('/attestation-types', requireAuth, types.listTypes);
apiRouter.post(
  '/attestation-types',
  requireAuth,
  adminOrAgent,
  body('name').trim().notEmpty(),
  body('description').optional().isString(),
  body('dynamicFields').optional().isArray(),
  handleValidation,
  types.createType
);
apiRouter.post(
  '/attestation-types/:id/version',
  requireAuth,
  adminOrAgent,
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('description').optional().isString(),
  body('dynamicFields').optional().isArray(),
  handleValidation,
  types.updateType
);
apiRouter.delete('/attestation-types/:id', requireAuth, adminOnly, param('id').isUUID(), handleValidation, types.deleteType);

apiRouter.get(
  '/requests',
  requireAuth,
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'on_hold']),
  handleValidation,
  requests.listRequests
);
apiRouter.post(
  '/requests',
  requireAuth,
  body('attestationTypeId').isUUID(),
  body('formPayload').optional().isObject(),
  handleValidation,
  requests.createRequest
);
apiRouter.patch(
  '/requests/:id',
  requireAuth,
  adminOrAgent,
  param('id').isUUID(),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'on_hold']),
  body('rejectionReason').optional().isString(),
  body('comments').optional().isString(),
  body('assignedTo').optional().isUUID(),
  handleValidation,
  requests.updateRequest
);
apiRouter.post('/requests/:id/approve', requireAuth, adminOrAgent, param('id').isUUID(), handleValidation, requests.approveRequest);
apiRouter.post(
  '/requests/:id/reject',
  requireAuth,
  adminOrAgent,
  param('id').isUUID(),
  body('rejectionReason').optional().isString(),
  body('comments').optional().isString(),
  handleValidation,
  requests.rejectRequest
);

apiRouter.get(
  '/attestations',
  requireAuth,
  archiveReaders,
  query('status').optional().isIn(['active', 'revoked', 'expired']),
  handleValidation,
  attestations.listAttestations
);
apiRouter.post('/attestations/:id/revoke', requireAuth, adminOrAgent, param('id').isUUID(), handleValidation, attestations.revokeAttestation);
apiRouter.get(
  '/attestations/:id/download-url',
  requireAuth,
  archiveReaders,
  param('id').isUUID(),
  handleValidation,
  attestations.signedDownloadUrl
);

apiRouter.get('/audit-logs', requireAuth, adminOrAgent, audit.listAuditLogs);
