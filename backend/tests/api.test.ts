import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { signAccessToken } from '../src/lib/tokens.js';
import type { Response } from 'supertest';

vi.mock('../src/utils/telegram', async () => {
  const actual = await vi.importActual<typeof import('../src/utils/telegram')>('../src/utils/telegram');
  return {
    ...actual,
    validateTelegramInitData: () => true,
  };
});

vi.stubEnv('JWT_SECRET', 'test-jwt-secret');
vi.stubEnv('ADMIN_JWT_SECRET', 'test-admin-jwt-secret');
vi.stubEnv('BOT_SYNC_SECRET', 'test-bot-sync-secret');
vi.stubEnv('ADMIN_TOKEN', 'change-me-in-production');
vi.stubEnv('GUEST_JWT_SECRET', 'test-guest-secret');
vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-bot-token');
const BOT_SYNC_SECRET = 'test-bot-sync-secret';
const ADMIN_TOKEN = 'change-me-in-production';

const { app } = await import('../src/index');
const { prisma } = await import('../src/lib/prisma');
import bcrypt from 'bcrypt';

function extractBearerToken(res: Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  for (const cookie of cookies) {
    const match = cookie.match(/access_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

function extractRefreshToken(res: Response): string | undefined {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  for (const cookie of cookies) {
    const match = cookie.match(/refresh_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

function extractCookieValue(cookies: string[] | undefined, name: string): string | undefined {
  if (!cookies) return undefined;
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

function getCookies(res: Response): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return cookies;
  for (const cookie of setCookie) {
    const match = cookie.match(/^(\w+)=([^;]+)/);
    if (match) cookies[match[1]] = decodeURIComponent(match[2]);
  }
  return cookies;
}

describe('API Integration Tests', () => {
  let server: import('http').Server;

  beforeAll(async () => {
    await prisma.$connect();
    server = app.listen(0);
  });

  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', database: 'ok' });
    });
  });

  describe('GET /api/objects', () => {
    it('should return paginated objects', async () => {
      const res = await request(app).get('/api/objects');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('objects');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.objects)).toBe(true);
    });
  });

  describe('GET /api/objects/:id', () => {
    it('should return a single object', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const res = await request(app).get(`/api/objects/${objects[0].id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', objects[0].id);
      expect(res.body).toHaveProperty('title');
    });

    it('should return 404 for non-existent object', async () => {
      const res = await request(app).get('/api/objects/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/telegram', () => {
    it('should create a new user with telegram data', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123456,"first_name":"Test","username":"testuser","language_code":"ru","is_premium":true,"allows_write_to_pm":true}' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.telegramId).toBe('123456');
      expect(res.body.user.firstName).toBe('Test');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.telegramLang).toBe('ru');
      expect(res.body.user.telegramPremium).toBe(true);
      expect(res.body.user.telegramAllowsPm).toBe(true);
    });

    it('should use username as firstName when first_name is empty', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123459,"username":"onlyuser"}' });

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('onlyuser');
      expect(res.body.user.username).toBe('onlyuser');
    });

    it('should not overwrite existing firstName with empty value on bot-sync', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123460,"first_name":"RealName","username":"realuser"}' });

      expect(created.status).toBe(200);
      expect(created.body.user.firstName).toBe('RealName');

      const adminSync = request(app)
        .post('/api/auth/telegram/bot-sync')
        .set('x-bot-sync-secret', BOT_SYNC_SECRET);

      const sync = await adminSync.send({
        telegramId: 123460,
        firstName: 'Changed',
        lastName: 'User',
        username: 'updateduser',
        languageCode: 'ru',
      });

      expect(sync.status).toBe(200);
      expect(sync.body.firstName).toBe('RealName');
      expect(sync.body.lastName).toBe('User');
      expect(sync.body.username).toBe('updateduser');
    });

    it('should reject bot-sync without the shared secret', async () => {
      await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123461,"first_name":"NoSecret","username":"nosecretuser"}' });

      const res = await request(app)
        .post('/api/auth/telegram/bot-sync')
        .send({ telegramId: 123461, firstName: 'Hijacked' });

      expect(res.status).toBe(401);
    });

    it('should update existing user and preserve phone', async () => {
      const first = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123457,"first_name":"First","username":"firstuser"}' });

      expect(first.status).toBe(200);
      const createdId = first.body.user.id;

      const second = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123457,"first_name":"Updated","username":"updateduser","language_code":"en"}' });

      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(createdId);
      expect(second.body.user.firstName).toBe('Updated');
      expect(second.body.user.telegramLang).toBe('en');
    });

    it('should return 400 for missing initData', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid initData', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('Telegram registration flow', () => {
    it('should register via telegram and then access protected route', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":999001,"first_name":"Reg","username":"reguser"}' });

       expect(res.status).toBe(200);
       const token = extractBearerToken(res);

       const me = await request(app)
         .get('/api/auth/me')
         .set('Authorization', `Bearer ${token}`);

      expect(me.status).toBe(200);
      expect(me.body.telegramId).toBe('999001');
      expect(me.body.firstName).toBe('Reg');
    });

    it('should sync user from bot and preserve previous fields', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":999002,"first_name":"Bot","username":"botuser"}' });

      expect(created.status).toBe(200);

      const sync = await request(app)
        .post('/api/auth/telegram/bot-sync')
        .set('x-bot-sync-secret', BOT_SYNC_SECRET)
        .send({
          telegramId: 999002,
          firstName: 'Updated',
          lastName: 'User',
          username: 'updateduser',
          languageCode: 'ru',
        });

      expect(sync.status).toBe(200);
      expect(sync.body.firstName).toBe('Bot');
      expect(sync.body.lastName).toBe('User');
      expect(sync.body.username).toBe('updateduser');
      expect(sync.body.telegramId).toBe('999002');
    });
  });

  describe('POST /api/leads', () => {
    it('should create a lead', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const res = await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Test User',
          phone: '+79999999999',
          comment: 'Test comment',
          consent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.lead).toHaveProperty('name', 'Test User');
    });

    it('should return 400 for invalid phone', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const res = await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Test',
          phone: '123',
          consent: true,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/leads/me', () => {
    it('should require auth', async () => {
      const res = await request(app).get('/api/leads/me');
      expect(res.status).toBe(401);
    });

    it('should return user leads', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const user = await prisma.user.create({
        data: {
          email: `leads-me-${Date.now()}@gab-invest.ru`,
          phone: `+790000000${Date.now() % 10000}`,
          passwordHash: await bcrypt.hash('pass123', 10),
          telegramId: `test-user-${Date.now()}`,
        },
      });

      await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Test User',
          phone: user.phone || '+79999999999',
          comment: 'Test',
          consent: true,
        });

      const token = signAccessToken(user.id, 'user', user.telegramId, user.role);

      const res = await request(app)
        .get('/api/leads/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/leads/my', () => {
    it('should return leads by clientId', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const created = await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Client User',
          phone: '+79999999998',
          comment: 'client lead',
          consent: true,
        });

      expect(created.status).toBe(201);
      const guestToken: string = created.body.guestToken;
      expect(guestToken).toBeTruthy();

      const res = await request(app)
        .get('/api/leads/my')
        .set('x-client-id', guestToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toHaveProperty('name', 'Client User');
    });

    it('should return 400 without clientId', async () => {
      const res = await request(app).get('/api/leads/my');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe('Admin API', () => {
    const ADMIN_TOKEN = 'change-me-in-production';

      it('POST /api/admin/auth/login should set cookies for admin', async () => {
        const email = `admin-test-${Date.now()}-${Math.random().toString(36).slice(2)}@gab-invest.ru`;
        const phone = `+790000000${Date.now() % 10000}${Math.floor(Math.random() * 10)}`;
        const passwordHash = await bcrypt.hash('admin123', 10);
        const admin = await prisma.user.create({
          data: {
            email,
            phone,
            passwordHash,
            role: 'admin',
          },
        });

        const res = await request(app)
          .post('/api/admin/auth/login')
          .send({ login: admin.email, password: 'admin123' });

        expect(res.status).toBe(200);
        expect(res.headers['set-cookie']).toBeDefined();
        expect(res.headers['set-cookie'].some((c: string) => c.startsWith('access_token='))).toBe(true);
        expect(res.headers['set-cookie'].some((c: string) => c.startsWith('refresh_token='))).toBe(true);
        expect(res.body.user.role).toBe('admin');
      });

    it('GET /api/admin/objects should return objects with admin JWT', async () => {
      const email = `admin-test2-${Date.now()}@gab-invest.ru`;
      const phone = `+790000000${Date.now() % 10000}`;
      const admin = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash: await bcrypt.hash('admin123', 10),
          role: 'admin',
        },
      });

      const loginRes = await request(app)
        .post('/api/admin/auth/login')
        .send({ login: admin.email, password: 'admin123' });

      const token = extractBearerToken(loginRes);

      const res = await request(app)
        .get('/api/admin/objects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/admin/objects should return objects with admin token', async () => {
      const res = await request(app)
        .get('/api/admin/objects')
        .set('x-admin-token', ADMIN_TOKEN);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/admin/objects should return 401 without token', async () => {
      const res = await request(app).get('/api/admin/objects');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/objects/:id should return 401 without token', async () => {
      const res = await request(app).get('/api/admin/objects/some-object-id');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('GET /api/admin/users/notify-subscribers should return 401 without token', async () => {
      const res = await request(app).get('/api/admin/users/notify-subscribers');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('GET /api/admin/users/notify-subscribers should accept bot sync secret', async () => {
      const res = await request(app)
        .get('/api/admin/users/notify-subscribers')
        .set('x-bot-sync-secret', BOT_SYNC_SECRET);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/admin/objects should create object with admin token', async () => {
      const res = await request(app)
        .post('/api/admin/objects')
        .set('x-admin-token', ADMIN_TOKEN)
        .send({
          title: 'Test Object',
          type: 'Офис',
          price: 1000000,
          yieldPercent: 10,
          location: 'Test Location',
          area: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Test Object');
    });

    it('PUT /api/admin/objects/:id should update object', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const res = await request(app)
        .put(`/api/admin/objects/${objects[0].id}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({
          title: 'Updated Title',
          type: objects[0].type,
          price: objects[0].price,
          yieldPercent: objects[0].yieldPercent,
          location: objects[0].location,
          area: objects[0].area,
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });

    it('DELETE /api/admin/objects/:id should delete object', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const lastObject = objects[objects.length - 1];
      const res = await request(app)
        .delete(`/api/admin/objects/${lastObject.id}`)
        .set('x-admin-token', ADMIN_TOKEN);

      expect(res.status).toBe(204);
    });

    it('PATCH /api/leads/:id/status should update lead status', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const lead = await prisma.lead.create({
        data: {
          objectId: objects[0].id,
          name: 'Status Test',
          phone: '+79999999999',
        },
      });

      const res = await request(app)
        .patch(`/api/leads/${lead.id}/status`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
    });

    it('PATCH /api/leads/:id/status should return 400 for invalid status', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const lead = await prisma.lead.create({
        data: {
          objectId: objects[0].id,
          name: 'Status Test 2',
          phone: '+79999999998',
        },
      });

      const res = await request(app)
        .patch(`/api/leads/${lead.id}/status`)
        .set('x-admin-token', ADMIN_TOKEN)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('Favorites API', () => {
    it('should require auth for favorites', async () => {
      const res = await request(app).get('/api/favorites');
      expect(res.status).toBe(401);
    });

    it('should add and remove favorite', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":999201,"first_name":"Fav","username":"favuser"}' });

      expect(created.status).toBe(200);
      const token = extractBearerToken(created);

      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const objectId = objects[0].id;

      const addRes = await request(app)
        .post(`/api/favorites/${objectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(addRes.status).toBe(201);
      expect(addRes.body).toHaveProperty('userId');
      expect(addRes.body).toHaveProperty('objectId', objectId);

      const getRes = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.some((f: any) => f.id === objectId)).toBe(true);

      const delRes = await request(app)
        .delete(`/api/favorites/${objectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(204);
    });

    it('should return 404 when adding favorite to non-existent object', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":999202,"first_name":"Fav2","username":"favuser2"}' });

      expect(created.status).toBe(200);
      const token = extractBearerToken(created);

      const res = await request(app)
        .post('/api/favorites/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update email and phone', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":999101,"first_name":"Profile","username":"profileuser"}' });

      expect(created.status).toBe(200);
      const token = extractBearerToken(created);

      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const profileEmail = `profile-${Date.now()}@test.com`;
      const profilePhone = `+7900${String(Date.now()).slice(-7)}`;

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Profile', lastName: 'User', email: profileEmail, phone: profilePhone });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(profileEmail);
      expect(res.body.phone).toBe(profilePhone);
    });

    it('should clear email and phone when empty string is sent', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":999102,"first_name":"Clear","username":"clearuser"}' });

      expect(created.status).toBe(200);
      const token = extractBearerToken(created);

      const setEmail = `set-${Date.now()}@test.com`;
      const setPhone = `+7901${String(Date.now()).slice(-7)}`;

      await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Clear', email: setEmail, phone: setPhone });

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Clear', email: '', phone: '' });

      expect(res.status).toBe(200);
      expect(res.body.email).toBeNull();
      expect(res.body.phone).toBeNull();
    });

    it('should require auth', async () => {
      const res = await request(app).put('/api/auth/profile').send({ firstName: 'NoAuth' });
      expect(res.status).toBe(401);
    });
  });

  describe('Public offer download', () => {
    let targetObjectId: string;

    beforeAll(async () => {
      const objects = await prisma.object.findMany({ take: 1 });
      if (objects.length > 0) {
        targetObjectId = objects[0].id;
      }
    });

    afterAll(async () => {
      if (!targetObjectId) return;
      await prisma.object.updateMany({
        where: { id: targetObjectId, offerFileUrl: { not: null } },
        data: { offerFileUrl: null, offerFileName: null, offerFileType: null },
      });
    });

    it('should return 404 for object without offer', async () => {
      if (!targetObjectId) return;

      await prisma.object.update({
        where: { id: targetObjectId },
        data: { offerFileUrl: null, offerFileName: null, offerFileType: null },
      });

      const res = await request(app).get(`/api/objects/${targetObjectId}/offer/download`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent object', async () => {
      const res = await request(app).get('/api/objects/nonexistent/offer/download');
      expect(res.status).toBe(404);
    });

    it('should download offer file for public', async () => {
      if (!targetObjectId) return;

      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const uploadsDir = path.join(__dirname, '..', 'uploads');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const testFileName = `test-offer-${Date.now()}.pdf`;
      const testFilePath = path.join(uploadsDir, testFileName);
      fs.writeFileSync(testFilePath, 'test pdf content');

      await prisma.object.update({
        where: { id: targetObjectId },
        data: {
          offerFileUrl: `/uploads/${testFileName}`,
          offerFileName: 'test-offer.pdf',
          offerFileType: 'application/pdf',
        },
      });

      const res = await request(app).get(`/api/objects/${targetObjectId}/offer/download`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('filename*=');

      fs.unlinkSync(testFilePath);
    });

    it('should normalize broken UTF-8 filename from latin1 mojibake', async () => {
      if (!targetObjectId) return;

      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const uploadsDir = path.join(__dirname, '..', 'uploads');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const testFileName = `test-offer-broken-${Date.now()}.pdf`;
      const testFilePath = path.join(uploadsDir, testFileName);
      fs.writeFileSync(testFilePath, 'test pdf content');

      const brokenName = 'Ð\x90Ð\x9F Ð§ÐµÑ…Ð¾Ð² Ð\x9FÑ\x8FÑ\x82ÐµÑ\x80Ð¾Ñ\x87ÐºÐ°.pdf';

      await prisma.object.update({
        where: { id: targetObjectId },
        data: {
          offerFileUrl: `/uploads/${testFileName}`,
          offerFileName: brokenName,
          offerFileType: 'application/pdf',
        },
      });

      const res = await request(app).get(`/api/objects/${targetObjectId}/offer/download`);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('filename*=');
      expect(res.headers['content-disposition']).not.toContain('Ð');

      fs.unlinkSync(testFilePath);
    });
  });

  describe('Refresh token rotation', () => {
    it('should rotate refresh token on /api/auth/refresh', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":800001,"first_name":"Refresh","username":"refreshuser"}' });
      expect(created.status).toBe(200);

      const cookies = getCookies(created);
      const oldRefreshToken = cookies['refresh_token'];
      expect(oldRefreshToken).toBeTruthy();

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${oldRefreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const newCookies = getCookies(res);
      const newRefreshToken = newCookies['refresh_token'];
      const newAccessToken = newCookies['access_token'];
      expect(newRefreshToken).toBeTruthy();
      expect(newAccessToken).toBeTruthy();
      expect(newRefreshToken).not.toBe(oldRefreshToken);
    });

    it('should revoke old refresh token after rotation', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":800002,"first_name":"Rotate","username":"rotateuser"}' });
      expect(created.status).toBe(200);

      const cookies = getCookies(created);
      const oldRefreshToken = cookies['refresh_token'];

      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${oldRefreshToken}`);

      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${oldRefreshToken}`);

      expect(reuseRes.status).toBe(401);
    });

    it('should return 401 without refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('should revoke refresh token on /api/auth/logout', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":800003,"first_name":"Logout","username":"logoutuser"}' });
      expect(created.status).toBe(200);

      const cookies = getCookies(created);
      const refreshToken = cookies['refresh_token'];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(reuseRes.status).toBe(401);
    });
  });

  describe('Cookie-based auth', () => {
    it('should set httpOnly, SameSite=lax cookies', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":700001,"first_name":"Cookie","username":"cookieuser"}' });
      expect(res.status).toBe(200);

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const accessCookie = setCookie.find((c: string) => c.startsWith('access_token='));
      const refreshCookie = setCookie.find((c: string) => c.startsWith('refresh_token='));
      expect(accessCookie).toContain('HttpOnly');
        expect(accessCookie).toContain('SameSite=');
        expect(accessCookie).toContain('HttpOnly');
        expect(refreshCookie).toContain('SameSite=');
    });

    it('should access protected route via cookie (not Bearer header)', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":700002,"first_name":"CookieMe","username":"cookiemeuser"}' });
      expect(created.status).toBe(200);

      const cookies = created.headers['set-cookie'].map((c: string) => c.split(';')[0]).join('; ');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.telegramId).toBe('700002');
      expect(res.body.firstName).toBe('CookieMe');
    });

    it('should return 401 for protected route without cookie or token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should auto-refresh access token via refresh cookie', async () => {
      const created = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":700003,"first_name":"Auto","username":"autouser"}' });
      expect(created.status).toBe(200);

      const cookies = getCookies(created);
      const refreshToken = cookies['refresh_token'];

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'];
      expect(setCookie.some((c: string) => c.startsWith('access_token='))).toBe(true);
    });
  });

  describe('Admin auth flow', () => {
    async function createAdmin(): Promise<{ email: string; id: string }> {
      const email = `admin-flow-${Date.now()}-${Math.random().toString(36).slice(2)}@gab-invest.ru`;
      const admin = await prisma.user.create({
        data: {
          email,
          phone: `+790000000${Math.random().toString(36).slice(2, 8)}`,
          passwordHash: await bcrypt.hash('admin123', 10),
          role: 'admin',
        },
      });
      return { email, id: admin.id };
    }

    it('POST /api/admin/auth/login should set cookies', async () => {
      const { email, id } = await createAdmin();

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ login: email, password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(id);
      expect(res.body.user.role).toBe('admin');
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = getCookies(res);
      expect(cookies['access_token']).toBeTruthy();
      expect(cookies['refresh_token']).toBeTruthy();
    });

    it('GET /api/admin/auth/me should work with admin cookie', async () => {
      const { email } = await createAdmin();

      const loginRes = await request(app)
        .post('/api/admin/auth/login')
        .send({ login: email, password: 'admin123' });
      expect(loginRes.status).toBe(200);

      const cookies = getCookies(loginRes);
      const cookieHeader = `access_token=${cookies['access_token']}; refresh_token=${cookies['refresh_token']}`;

      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Cookie', cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });

    it('GET /api/admin/auth/me should return 401 without token', async () => {
      const res = await request(app).get('/api/admin/auth/me');
      expect(res.status).toBe(401);
    });

    it('POST /api/admin/auth/refresh should rotate tokens', async () => {
      const { email } = await createAdmin();

      const loginRes = await request(app)
        .post('/api/admin/auth/login')
        .send({ login: email, password: 'admin123' });
      expect(loginRes.status).toBe(200);

      const cookies = getCookies(loginRes);
      const oldRefreshToken = cookies['refresh_token'];

      const res = await request(app)
        .post('/api/admin/auth/refresh')
        .set('Cookie', `refresh_token=${oldRefreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const newCookies = getCookies(res);
      expect(newCookies['refresh_token']).toBeTruthy();
      expect(newCookies['refresh_token']).not.toBe(oldRefreshToken);
    });

    it('POST /api/admin/auth/logout should clear cookies', async () => {
      const { email } = await createAdmin();

      const loginRes = await request(app)
        .post('/api/admin/auth/login')
        .send({ login: email, password: 'admin123' });
      expect(loginRes.status).toBe(200);

      const cookies = getCookies(loginRes);

      const res = await request(app)
        .post('/api/admin/auth/logout')
        .set('Cookie', `access_token=${cookies['access_token']}; refresh_token=${cookies['refresh_token']}`);

      expect(res.status).toBe(200);
      const setCookie = res.headers['set-cookie'];
      const hasClearedAccess = setCookie.some((c: string) =>
        c.startsWith('access_token=;') || c.includes('access_token') && c.includes('Expires=Thu, Jan 01 1970'),
      );
      expect(hasClearedAccess).toBe(true);
    });
  });

  describe('Bot-sync secret rotation', () => {
    it('should accept BOT_SYNC_SECRET_PREVIOUS', async () => {
      vi.stubEnv('BOT_SYNC_SECRET', 'new-secret');
      vi.stubEnv('BOT_SYNC_SECRET_PREVIOUS', 'old-secret');

      const res = await request(app)
        .post('/api/auth/telegram/bot-sync')
        .set('x-bot-sync-secret', 'old-secret')
        .send({ telegramId: 800100, firstName: 'Rotated' });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Rotated');

      vi.stubEnv('BOT_SYNC_SECRET', BOT_SYNC_SECRET);
      vi.stubEnv('BOT_SYNC_SECRET_PREVIOUS', '');
    });

    it('should reject invalid bot-sync secret', async () => {
      const res = await request(app)
        .post('/api/auth/telegram/bot-sync')
        .set('x-bot-sync-secret', 'wrong-secret')
        .send({ telegramId: 800200, firstName: 'Hijack' });

      expect(res.status).toBe(401);
    });
  });

  describe('Guest lead token flow', () => {
    it('should create lead without auth and return guest token', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const res = await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Guest',
          phone: '+79998887766',
          consent: true,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('guestToken');
      expect(typeof res.body.guestToken).toBe('string');
    });

    it('should retrieve leads via guest token', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      const created = await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Guest',
          phone: '+79998887765',
          consent: true,
        });
      expect(created.status).toBe(201);

      const guestToken = created.body.guestToken;

      const res = await request(app)
        .get('/api/leads/my')
        .set('x-client-id', guestToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((l: any) => l.phone === '+79998887765')).toBe(true);
    });

    it('should merge guest leads after login', async () => {
      const objects = await prisma.object.findMany({ where: { moderation: { is: { status: 'approved' } } } });
      if (objects.length === 0) return;

      await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'PreLogin',
          phone: '+79998887764',
          consent: true,
        });

      const authRes = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":800300,"first_name":"MergeMe","username":"mergemeuser"}' });
      expect(authRes.status).toBe(200);

      const cookies = getCookies(authRes);
      const accessToken = cookies['access_token'];

      const meRes = await request(app)
        .get('/api/leads/me')
        .set('Cookie', `access_token=${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(Array.isArray(meRes.body)).toBe(true);
    });
  });

  describe('Token security', () => {
    it('should not include token in auth response body', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":600001,"first_name":"NoToken","username":"notokenuser"}' });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.body).not.toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
    });

    it('should not include token in admin auth response body', async () => {
      const email = `admin-notoken-${Date.now()}@gab-invest.ru`;
      const admin = await prisma.user.create({
        data: {
          email,
          phone: `+790000000${Math.random().toString(36).slice(2, 8)}`,
          passwordHash: await bcrypt.hash('admin123', 10),
          role: 'admin',
        },
      });

      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({ login: admin.email, password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });
  });
});
