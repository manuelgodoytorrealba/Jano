import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/auth/mail.service';

describe('authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let agent: ReturnType<typeof request.agent>;
  let mailService: MailService;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `auth-e2e-${suffix}@example.test`;
  const privilegedEmail = `auth-e2e-privileged-${suffix}@example.test`;
  const verificationEmail = `auth-e2e-verification-${suffix}@example.test`;
  const statusEmail = `auth-e2e-status-${suffix}@example.test`;
  const password = 'correct-horse-battery';

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

    prisma = app.get(PrismaService);
    mailService = app.get(MailService);
    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [email, privilegedEmail, verificationEmail, statusEmail] } },
    });
    await app.close();
  });

  it('registers, restores from its cookie, logs out, and logs in again', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    const register = await agent
      .post('/api/auth/register')
      .send({ email: `  ${email.toUpperCase()}  `, name: '  Auth E2E  ', password })
      .expect(201);

    expect(register.body).toEqual({
      user: expect.objectContaining({ email, name: 'Auth E2E', role: 'USER', isBeta: false }),
    });
    expect(register.body.accessToken).toBeUndefined();
    expect(register.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('jano_access_token=')]),
    );
    expect(register.headers['set-cookie'][0]).toContain('HttpOnly');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.role).toBe('USER');
    expect(stored.plan).toBe('FREE');
    expect(stored.passwordHash).not.toBe(password);
    await expect(bcrypt.compare(password, stored.passwordHash)).resolves.toBe(true);

    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ email, role: 'USER' });
      });
    await agent.get('/api/entities?limit=1').expect(200);

    const logout = await agent.post('/api/auth/logout').send({}).expect(204);
    expect(logout.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('jano_access_token=;')]),
    );
    await agent.get('/api/auth/me').expect(401);

    await agent.post('/api/auth/login').send({ email, password }).expect(201);
    await agent
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ email, role: 'USER' });
      });

    const genericForgot = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(202);
    await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: `missing-${suffix}@example.test` })
      .expect(202)
      .expect(({ body }) => expect(body).toEqual(genericForgot.body));

    const resetUrl = mailService.getLatestTestPasswordReset()?.resetUrl;
    expect(resetUrl).toBeDefined();
    const token = new URL(resetUrl!).searchParams.get('token');
    expect(token).toBeTruthy();
    const persistedToken = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: stored.id },
    });
    expect(persistedToken.tokenHash).not.toContain(token!);

    const resetPassword = 'new-correct-horse-battery';
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token, password: resetPassword })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token, password: resetPassword })
      .expect(400);
    await agent.get('/api/auth/me').expect(401);
    await agent.post('/api/auth/login').send({ email, password }).expect(401);
    await agent.post('/api/auth/login').send({ email, password: resetPassword }).expect(201);

    await agent
      .post('/api/auth/change-password')
      .send({ currentPassword: resetPassword, newPassword: 'final-correct-horse-battery' })
      .expect(204);
    await agent.get('/api/auth/me').expect(401);
    await agent
      .post('/api/auth/login')
      .send({ email, password: 'final-correct-horse-battery' })
      .expect(201);
  });

  it('rejects privilege fields on public registration', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: privilegedEmail,
        password,
        role: 'ADMIN',
        plan: 'PREMIUM',
        isBeta: true,
      })
      .expect(400);

    await expect(prisma.user.findUnique({ where: { email: privilegedEmail } })).resolves.toBeNull();
  });

  it('verifies a newly registered email, rejects invalid and expired links, and reflects verification through /auth/me', async () => {
    const verificationAgent = request.agent(app.getHttpServer());
    await verificationAgent
      .post('/api/auth/register')
      .send({ email: verificationEmail, password })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: verificationEmail } });
    expect(user.emailVerifiedAt).toBeNull();

    const url = mailService.getLatestTestEmailVerification()?.verificationUrl;
    const token = new URL(url!).searchParams.get('token')!;
    const stored = await prisma.emailVerificationToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(stored.tokenHash).not.toContain(token);
    await request(app.getHttpServer()).post('/api/auth/verify-email').send({ token }).expect(201);
    await verificationAgent
      .get('/api/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.emailVerifiedAt).toBeTruthy());
    await request(app.getHttpServer()).post('/api/auth/verify-email').send({ token }).expect(400);

    const expiredToken = 'expired-token';
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(expiredToken).digest('hex'),
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: expiredToken })
      .expect(400);
  });

  it('resends verification only for an authenticated unverified user and invalidates the previous token', async () => {
    const resendAgent = request.agent(app.getHttpServer());
    await request(app.getHttpServer()).post('/api/auth/resend-verification').send({}).expect(401);
    await resendAgent.post('/api/auth/register').send({ email: statusEmail, password }).expect(201);
    const tokenA = new URL(
      mailService.getLatestTestEmailVerification()!.verificationUrl,
    ).searchParams.get('token')!;
    await resendAgent.post('/api/auth/resend-verification').send({}).expect(201);
    const tokenB = new URL(
      mailService.getLatestTestEmailVerification()!.verificationUrl,
    ).searchParams.get('token')!;
    expect(tokenA).not.toBe(tokenB);
    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: tokenA })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/verify-email')
      .send({ token: tokenB })
      .expect(201);
    await resendAgent
      .post('/api/auth/resend-verification')
      .send({})
      .expect(201)
      .expect(({ body }) => expect(body.status).toBe('already-verified'));
  });

  it('rejects suspended or disabled accounts at login and invalidates an already-issued JWT immediately', async () => {
    const statusAgent = request.agent(app.getHttpServer());
    // Reuse the verified account from the resend test as the real active baseline.
    await statusAgent.post('/api/auth/login').send({ email: statusEmail, password }).expect(201);
    await statusAgent.get('/api/auth/me').expect(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: statusEmail } });
    await prisma.user.update({ where: { id: user.id }, data: { accountStatus: 'SUSPENDED' } });
    await statusAgent.get('/api/auth/me').expect(401);
    await statusAgent.get('/api/me/collections').expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: statusEmail, password })
      .expect(401);
    await prisma.user.update({ where: { id: user.id }, data: { accountStatus: 'ACTIVE' } });
    await statusAgent.post('/api/auth/login').send({ email: statusEmail, password }).expect(201);
    await statusAgent.get('/api/auth/me').expect(200);
    await prisma.user.update({ where: { id: user.id }, data: { accountStatus: 'DISABLED' } });
    await statusAgent.get('/api/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: statusEmail, password })
      .expect(401);
  });
});
