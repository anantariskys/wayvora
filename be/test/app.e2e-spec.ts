/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';
import { AppModule } from './../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
      });
  });

  it('runs the core authenticated trip planning flow', async () => {
    const email = `maya.${Date.now()}@example.com`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Str0ngPassword!2026',
        fullName: 'Maya Santoso',
      })
      .expect(201);
    const accessToken = registerResponse.body.data.accessToken;
    const refreshToken = registerResponse.body.data.refreshToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.accessToken).toEqual(expect.any(String));
        expect(body.data.refreshToken).toEqual(expect.any(String));
      });

    const tripResponse = await request(app.getHttpServer())
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Jakarta Kos Route',
        description: 'Route from kos to city places.',
      })
      .expect(201);
    const tripId = tripResponse.body.data.id;

    await request(app.getHttpServer())
      .get('/api/v1/trips?page=1&limit=20&sort=createdAt:desc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.total).toBe(1);
        expect(body.meta.totalPages).toBe(1);
      });

    for (const place of [
      {
        provider: 'osm',
        providerPlaceId: 'osm.monas',
        name: 'Monumen Nasional',
        address: 'Gambir, Central Jakarta',
        city: 'Jakarta',
        country: 'Indonesia',
        latitude: -6.1754,
        longitude: 106.8272,
        category: 'landmark',
      },
      {
        provider: 'osm',
        providerPlaceId: 'osm.kota_tua',
        name: 'Kota Tua Jakarta',
        address: 'Pinangsia, West Jakarta',
        city: 'Jakarta',
        country: 'Indonesia',
        latitude: -6.1352,
        longitude: 106.8133,
        category: 'historic',
      },
    ]) {
      await request(app.getHttpServer())
        .post(`/api/v1/trips/${tripId}/places`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ place, dayNumber: 1 })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/optimize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        profile: 'driving',
        returnToStart: false,
        startPoint: {
          provider: 'maplibre',
          providerPlaceId: 'kos:test',
          name: 'Kos Test',
          address: 'Jakarta Selatan',
          city: 'Jakarta',
          country: 'Indonesia',
          latitude: -6.2297,
          longitude: 106.8217,
          category: 'lodging',
        },
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.routeId).toEqual(expect.any(String));
        expect(body.data.startPoint.name).toBe('Kos Test');
        expect(body.data.orderedStops).toHaveLength(2);
        expect(body.data.summary.totalDistanceMeters).toBeGreaterThan(0);
      });
  });
});
