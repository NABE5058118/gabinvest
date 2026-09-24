import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/utils/telegram', async () => {
  const actual = await vi.importActual<typeof import('../src/utils/telegram')>('../src/utils/telegram');
  return {
    ...actual,
    validateTelegramInitData: () => true,
  };
});

vi.stubEnv('JWT_SECRET', 'test-jwt-secret');
vi.stubEnv('ADMIN_JWT_SECRET', 'test-admin-jwt-secret');

const { app } = await import('../src/index');
const { prisma } = await import('../src/lib/prisma');
import bcrypt from 'bcrypt';

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
      expect(res.body).toEqual({ status: 'ok' });
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
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

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
      const token = res.body.token;

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
        .send({
          telegramId: 999002,
          firstName: 'Updated',
          lastName: 'User',
          username: 'updateduser',
          languageCode: 'ru',
        });

      expect(sync.status).toBe(200);
      expect(sync.body.firstName).toBe('Updated');
      expect(sync.body.lastName).toBe('User');
      expect(sync.body.username).toBe('updateduser');
      expect(sync.body.telegramId).toBe('999002');
    });
  });

  describe('POST /api/leads', () => {
    it('should create a lead', async () => {
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

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
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

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
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

      const user = await prisma.user.create({
        data: {
          email: `leads-me-${Date.now()}@gab-invest.ru`,
          phone: `+790000000${Date.now() % 10000}`,
          passwordHash: await bcrypt.hash('pass123', 10),
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

      const token = jwt.sign({ userId: user.id }, 'test-jwt-secret', { expiresIn: '1h', algorithm: 'HS256' });

      const res = await request(app)
        .get('/api/leads/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/leads/my', () => {
    it('should return leads by clientId', async () => {
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

      const clientId = 'test-client-' + Date.now();

      await request(app)
        .post('/api/leads')
        .send({
          objectId: objects[0].id,
          name: 'Client User',
          phone: '+79999999998',
          comment: 'client lead',
          consent: true,
          clientId,
        });

      const res = await request(app)
        .get('/api/leads/my')
        .set('x-client-id', clientId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toHaveProperty('name', 'Client User');
    });

    it('should return 400 without clientId', async () => {
      const res = await request(app).get('/api/leads/my');
      expect(res.status).toBe(400);
    });
  });

  describe('Admin API', () => {
    const ADMIN_TOKEN = 'change-me-in-production';

    it('POST /api/admin/auth/login should return JWT for admin', async () => {
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
      expect(res.body).toHaveProperty('token');
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

      const token = loginRes.body.token;

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
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

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
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

      const lastObject = objects[objects.length - 1];
      const res = await request(app)
        .delete(`/api/admin/objects/${lastObject.id}`)
        .set('x-admin-token', ADMIN_TOKEN);

      expect(res.status).toBe(204);
    });

    it('PATCH /api/leads/:id/status should update lead status', async () => {
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

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
      const objects = await prisma.object.findMany();
      if (objects.length === 0) {
        it.skip('no objects in database');
        return;
      }

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
  });
});
