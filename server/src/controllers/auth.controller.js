import { logAudit } from '../services/audit.service.js';

export async function recordLogin(req, res, next) {
  try {
    await logAudit({
      userId: req.user.id,
      action: 'login',
      entityType: 'session',
      entityId: null,
      ip: req.ip,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
