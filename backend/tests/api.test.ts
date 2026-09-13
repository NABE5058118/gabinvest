import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/lib/prisma';

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
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123456,"first_name":"Test","username":"testuser"}' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.telegramId).toBe('123456');
      expect(res.body.firstName).toBe('Test');
    });

    it('should update existing user', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({ initData: 'query_id=test&user={"id":123456,"first_name":"Updated","username":"testuser"}' });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Updated');
    });

    it('should return 400 for missing initData', async () => {
      const res = await request(app)
        .post('/api/auth/telegram')
        .send({});

      expect(res.status).toBe(400);
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
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Admin API', () => {
    const ADMIN_TOKEN = 'change-me-in-production';

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
  });

  describe('Favorites API', () => {
    it('should require auth for favorites', async () => {
      const res = await request(app).get('/api/favorites');
      expect(res.status).toBe(401);
    });
  });
});
