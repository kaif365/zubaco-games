/**
 * SECTION I — NOTIFICATIONS (DATABASE-BACKED integration, Phase T4-A)
 *
 * Real NotificationService against a REAL PostgreSQL. Push (Firebase) is a true
 * external boundary and is intentionally inert here (no FCM key configured → the
 * push call short-circuits), so these tests focus on the authoritative database
 * behaviour: persistence, read-state transitions, bulk fan-out and consistency.
 */
import { Harness, startHarness } from './harness';
import { createUser } from './prisma-test-util';

describe('Notifications — DB integration', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startHarness();
  });

  afterAll(async () => {
    await h.stop();
  });

  beforeEach(async () => {
    await h.reset();
  });

  it('persists a notification and reports it as unread', async () => {
    const { id } = await createUser(h.graph.prisma);

    const created = await h.graph.notification.sendNotification(
      id,
      'SYSTEM',
      'Welcome',
      'Your account is ready',
      { deep_link: '/home' },
    );
    expect(created.id).toBeTruthy();
    expect(created.read).toBe(false);

    const list = await h.graph.notification.getNotifications(id);
    expect(list.total).toBe(1);
    expect(list.unread_count).toBe(1);
    expect(list.notifications[0].title).toBe('Welcome');
  });

  it('marks a single notification as read (read-state consistency)', async () => {
    const { id } = await createUser(h.graph.prisma);
    const n1 = await h.graph.notification.sendNotification(id, 'SYSTEM', 'A', 'a');
    await h.graph.notification.sendNotification(id, 'SYSTEM', 'B', 'b');

    await h.graph.notification.markAsRead(id, n1.id);

    const list = await h.graph.notification.getNotifications(id);
    expect(list.total).toBe(2);
    expect(list.unread_count).toBe(1); // only one remains unread

    const reloaded = await h.graph.prisma.notification.findUnique({ where: { id: n1.id } });
    expect(reloaded!.read).toBe(true);
  });

  it('marks all notifications read', async () => {
    const { id } = await createUser(h.graph.prisma);
    await h.graph.notification.sendNotification(id, 'SYSTEM', 'A', 'a');
    await h.graph.notification.sendNotification(id, 'PROMOTION', 'B', 'b');
    await h.graph.notification.sendNotification(id, 'SYSTEM', 'C', 'c');

    await h.graph.notification.markAllRead(id);

    const list = await h.graph.notification.getNotifications(id);
    expect(list.unread_count).toBe(0);
  });

  it('does not let one user mark another user\'s notification read', async () => {
    const owner = await createUser(h.graph.prisma);
    const other = await createUser(h.graph.prisma);
    const n = await h.graph.notification.sendNotification(owner.id, 'SYSTEM', 'Private', 'x');

    await h.graph.notification.markAsRead(other.id, n.id); // wrong user — no-op

    const reloaded = await h.graph.prisma.notification.findUnique({ where: { id: n.id } });
    expect(reloaded!.read).toBe(false);
  });

  it('fans out a bulk notification to every recipient', async () => {
    const users = await Promise.all([
      createUser(h.graph.prisma),
      createUser(h.graph.prisma),
      createUser(h.graph.prisma),
    ]);

    await h.graph.notification.sendBulkNotification(
      users.map((u) => u.id),
      'STAGE_OPEN',
      'Stage 1 open',
      'Play now',
    );

    const total = await h.graph.prisma.notification.count();
    expect(total).toBe(3);
    for (const u of users) {
      expect(await h.graph.prisma.notification.count({ where: { user_id: u.id } })).toBe(1);
    }
  });
});
