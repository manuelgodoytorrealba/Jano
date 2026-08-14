import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('public discovery (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  it('serves the complete Explorer discovery contract without a session', async () => {
    await request(app.getHttpServer()).get('/api/entities?limit=1').expect(200);
    await request(app.getHttpServer()).get('/api/entities/institutions').expect(200);
    await request(app.getHttpServer()).get('/api/entities/nationalities').expect(200);
    await request(app.getHttpServer()).get('/api/entities/not-a-real-public-slug').expect(404);
    await request(app.getHttpServer())
      .get('/api/entities/not-a-real-public-slug/preview')
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/entities/not-a-real-public-slug/graph')
      .expect(404);
    await request(app.getHttpServer()).get('/api/tags').expect(200);
    await request(app.getHttpServer()).get('/api/search?q=art').expect(200);
    await request(app.getHttpServer()).get('/api/home-decks?surface=HOME').expect(200);
    await request(app.getHttpServer()).get('/api/app-settings').expect(200);
  });

  it('keeps public research readable and editorial writes private', async () => {
    await request(app.getHttpServer()).get('/api/public/research').expect(200);
    await request(app.getHttpServer()).post('/api/entities').send({}).expect(401);
    await request(app.getHttpServer()).patch('/api/entities/any-id').send({}).expect(401);
    await request(app.getHttpServer()).delete('/api/entities/any-id').expect(401);
  });
});
