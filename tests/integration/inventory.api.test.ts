import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { SupplyCategory } from '../../src/modules/inventory/models/medical-supply.model';
import { ConflictError, NotFoundError } from '../../src/shared/middleware/error.middleware';

const makeToken = (role: 'admin' | 'manager' | 'operator' = 'admin') =>
  jwt.sign({ userId: 'test-user', email: 'test@hospital.mx', role },
    process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });

const mockSupply = {
  id: 'supply-uuid-001', sku: 'GAS001', name: 'Gasas Estériles',
  category: SupplyCategory.CONSUMABLE, unit: 'caja',
  currentStock: 50, minStock: 10, criticalStock: 5, unitCost: 45.00, active: true,
};

describe('Inventory API - /api/v1/inventory', () => {
  let sandbox: sinon.SinonSandbox;
  let adminToken: string;
  let operatorToken: string;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    adminToken = makeToken('admin');
    operatorToken = makeToken('operator');
  });

  afterEach(() => { sandbox.restore(); });

  // ── GET / ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/inventory', () => {
    it('retorna lista paginada de insumos', async () => {
      sandbox.stub(InventoryService.prototype, 'findAll').resolves({ rows: [mockSupply] as any, count: 1 });
      const res = await request(app).get('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.have.length(1);
      expect(res.body.meta.total).to.equal(1);
    });

    it('retorna 401 sin token', async () => {
      const res = await request(app).get('/api/v1/inventory');
      expect(res.status).to.equal(401);
    });
  });

  // ── POST / ───────────────────────────────────────────────────────────────
  describe('POST /api/v1/inventory', () => {
    const validPayload = { sku: 'GAS001', name: 'Gasas Estériles', category: SupplyCategory.CONSUMABLE, unit: 'caja', unitCost: 45.00 };

    it('crea insumo con rol admin', async () => {
      sandbox.stub(InventoryService.prototype, 'createSupply').resolves(mockSupply as any);
      const res = await request(app).post('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`).send(validPayload);
      expect(res.status).to.equal(201);
      expect(res.body.data.sku).to.equal('GAS001');
    });

    it('retorna 403 con rol operator', async () => {
      const res = await request(app).post('/api/v1/inventory').set('Authorization', `Bearer ${operatorToken}`).send(validPayload);
      expect(res.status).to.equal(403);
    });

    it('retorna 400 con datos inválidos (sin SKU)', async () => {
      const res = await request(app).post('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sin SKU', unitCost: 10 });
      expect(res.status).to.equal(400);
      expect(res.body.errors).to.be.an('array').that.is.not.empty;
    });

    it('retorna 409 si SKU ya existe', async () => {
      sandbox.stub(InventoryService.prototype, 'createSupply').rejects(new ConflictError("El SKU 'GAS001' ya existe"));
      const res = await request(app).post('/api/v1/inventory').set('Authorization', `Bearer ${adminToken}`).send(validPayload);
      expect(res.status).to.equal(409);
      expect(res.body.message).to.include('GAS001');
    });
  });

  // ── GET /:id ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/inventory/:id', () => {
    it('retorna insumo existente por ID', async () => {
      sandbox.stub(InventoryService.prototype, 'findById').resolves(mockSupply as any);
      const res = await request(app).get('/api/v1/inventory/supply-uuid-001').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.data.id).to.equal('supply-uuid-001');
    });

    it('retorna 404 si el insumo no existe', async () => {
      sandbox.stub(InventoryService.prototype, 'findById').rejects(new NotFoundError('Insumo médico'));
      const res = await request(app).get('/api/v1/inventory/non-existent').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).to.equal(404);
    });
  });

  // ── POST /:id/movements ───────────────────────────────────────────────────
  describe('POST /api/v1/inventory/:id/movements', () => {
    it('registra movimiento de entrada correctamente', async () => {
      const mockMov = { id: 'mov-001', type: 'in', quantity: 20, stockBefore: 50, stockAfter: 70 };
      sandbox.stub(InventoryService.prototype, 'registerMovement').resolves(mockMov as any);
      const res = await request(app).post('/api/v1/inventory/supply-uuid-001/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'in', reason: 'purchase', quantity: 20 });
      expect(res.status).to.equal(201);
      expect(res.body.data.stockAfter).to.equal(70);
    });

    it('retorna 400 si la cantidad es 0', async () => {
      const res = await request(app).post('/api/v1/inventory/supply-uuid-001/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'out', reason: 'clinical_use', quantity: 0 });
      expect(res.status).to.equal(400);
    });
  });

  // ── Reports ──────────────────────────────────────────────────────────────
  describe('GET /api/v1/inventory/reports/low-stock', () => {
    it('retorna reporte de insumos con stock bajo', async () => {
      sandbox.stub(InventoryService.prototype, 'getLowStockReport').resolves([
        { ...mockSupply, currentStock: 3 }, { ...mockSupply, currentStock: 0 },
      ] as any);
      const res = await request(app).get('/api/v1/inventory/reports/low-stock').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.length(2);
    });
  });

  describe('GET /api/v1/health', () => {
    it('retorna estado ok sin autenticación', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('ok');
    });
  });
});
