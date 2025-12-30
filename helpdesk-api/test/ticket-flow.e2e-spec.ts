import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TicketFlow (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authToken: string;
    let userId: number;
    let ticketId: number;

    const testUser = {
        email: `e2e_${Date.now()}@test.com`,
        password: 'password123',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);
    });

    afterAll(async () => {
        // Cleanup
        if (userId) {
            await prisma.ticketHistory.deleteMany({ where: { changerId: userId } });
            await prisma.ticketComment.deleteMany({ where: { authorId: userId } });
            await prisma.ticket.deleteMany({ where: { creatorId: userId } });
            await prisma.user.delete({ where: { id: userId } });
        }
        await app.close();
    });

    it('/auth/signup (POST) - Create User', () => {
        return request(app.getHttpServer())
            .post('/auth/signup')
            .send(testUser)
            .expect(201)
            .then((res) => {
                expect(res.body.access_token).toBeDefined();
                authToken = res.body.access_token;
                // Decode token or get from response if meaningful, here we just trust the flow
                // For simplicity, we can fetch the user by email to get ID
            });
    });

    it('Get User ID', async () => {
        const user = await prisma.user.findUnique({
            where: { email: testUser.email },
        });
        userId = user.id;
        expect(userId).toBeDefined();
    });

    it('/tickets (POST) - Create Ticket', () => {
        return request(app.getHttpServer())
            .post('/tickets')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'E2E Test Ticket',
                description: 'Testing the entire flow',
                priority: 'HIGH',
            })
            .expect(201)
            .then((res) => {
                expect(res.body.id).toBeDefined();
                expect(res.body.title).toEqual('E2E Test Ticket');
                ticketId = res.body.id;
            });
    });

    it('/tickets (GET) - List with Pagination', () => {
        return request(app.getHttpServer())
            .get('/tickets?page=1&limit=5')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
                expect(res.body.data).toBeInstanceOf(Array);
                expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
                const found = res.body.data.find((t) => t.id === ticketId);
                expect(found).toBeDefined();
            });
    });

    it('/tickets/:id/status (PATCH) - Update Status & Log History', () => {
        return request(app.getHttpServer())
            .patch(`/tickets/${ticketId}/status`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'IN_PROGRESS' })
            .expect(200)
            .then((res) => {
                expect(res.body.status).toEqual('IN_PROGRESS');
            });
    });

    it('/tickets/:id/history (GET) - Verify Audit Log', () => {
        return request(app.getHttpServer())
            .get(`/tickets/${ticketId}/history`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
            .then((res) => {
                expect(res.body).toBeInstanceOf(Array);
                const entry = res.body.find((h) => h.field === 'status');
                expect(entry).toBeDefined();
                expect(entry.oldValue).toEqual('OPEN');
                expect(entry.newValue).toEqual('IN_PROGRESS');
                expect(entry.changer.email).toEqual(testUser.email);
            });
    });
});
