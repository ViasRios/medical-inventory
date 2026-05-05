import { expect } from 'chai';
import sinon from 'sinon';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { MedicalSupply, SupplyCategory } from '../../src/modules/inventory/models/medical-supply.model';
import { StockMovement, MovementType, MovementReason } from '../../src/modules/inventory/models/stock-movement.model';
import { Supplier } from '../../src/modules/suppliers/models/supplier.model';
import { sequelize } from '../../src/shared/database/connection';
import { ConflictError, NotFoundError, ValidationAppError } from '../../src/shared/middleware/error.middleware';

describe('InventoryService', () => {
  let service: InventoryService;
  let sandbox: sinon.SinonSandbox;

  const makeMockSupply = (overrides: object = {}) => ({
    id: 'uuid-001', sku: 'GAS001', name: 'Gasas Estériles',
    category: SupplyCategory.CONSUMABLE, unit: 'caja',
    currentStock: 50, minStock: 10, criticalStock: 5, unitCost: 45.00, active: true,
    update: sinon.stub().resolvesThis(),
    ...overrides,
  });

  const mockTx = { commit: sinon.stub().resolves(), rollback: sinon.stub().resolves() };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    service = new InventoryService();
  });

  afterEach(() => { sandbox.restore(); });

  // ── createSupply ──────────────────────────────────────────────────────────
  describe('createSupply()', () => {
    it('crea insumo cuando el SKU no existe', async () => {
      const mockSupply = makeMockSupply();
      sandbox.stub(MedicalSupply, 'findOne').resolves(null);
      sandbox.stub(Supplier, 'findByPk').resolves({ id: 'sup-001' } as any);
      sandbox.stub(MedicalSupply, 'create').resolves(mockSupply as any);

      const result = await service.createSupply({
        sku: 'GAS001', name: 'Gasas', category: SupplyCategory.CONSUMABLE,
        unit: 'caja', unitCost: 45, supplierId: 'sup-001',
      });
      expect(result.sku).to.equal('GAS001');
      expect((MedicalSupply.create as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('lanza ConflictError si el SKU ya existe', async () => {
      sandbox.stub(MedicalSupply, 'findOne').resolves(makeMockSupply() as any);
      try {
        await service.createSupply({ sku: 'GAS001', name: 'Dup', category: SupplyCategory.CONSUMABLE, unit: 'caja', unitCost: 10 });
        expect.fail('Debió lanzar ConflictError');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictError);
        expect((err as ConflictError).statusCode).to.equal(409);
      }
    });

    it('lanza NotFoundError si el proveedor no existe', async () => {
      sandbox.stub(MedicalSupply, 'findOne').resolves(null);
      sandbox.stub(Supplier, 'findByPk').resolves(null);
      try {
        await service.createSupply({ sku: 'NEW', name: 'N', category: SupplyCategory.CONSUMABLE, unit: 'pz', unitCost: 10, supplierId: 'bad-id' });
        expect.fail('Debió lanzar NotFoundError');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  // ── registerMovement ──────────────────────────────────────────────────────
  describe('registerMovement()', () => {
    const baseDto = { supplyId: 'uuid-001', type: MovementType.OUT, reason: MovementReason.CLINICAL_USE, quantity: 5, performedBy: 'user-1' };

    beforeEach(() => {
      sandbox.stub(MedicalSupply, 'findByPk').resolves(makeMockSupply() as any);
      sandbox.stub(sequelize, 'transaction').resolves(mockTx as any);
      sandbox.stub(StockMovement, 'create').callsFake(async (data: any) => ({ ...data }));
    });

    it('registra salida de stock correctamente', async () => {
      const movement = await service.registerMovement(baseDto);
      expect(movement.stockBefore).to.equal(50);
      expect(movement.stockAfter).to.equal(45);
    });

    it('lanza ValidationAppError si el stock es insuficiente', async () => {
      try {
        await service.registerMovement({ ...baseDto, quantity: 999 });
        expect.fail('Debió lanzar ValidationAppError');
      } catch (err) {
        expect(err).to.be.instanceOf(ValidationAppError);
        expect((err as Error).message).to.include('Stock insuficiente');
      }
    });

    it('calcula stockAfter correctamente para entradas (IN)', async () => {
      const movement = await service.registerMovement({ ...baseDto, type: MovementType.IN, reason: MovementReason.PURCHASE });
      expect(movement.stockAfter).to.equal(55); // 50 + 5
    });

    it('calcula stockAfter como valor absoluto en ajustes (ADJUSTMENT)', async () => {
      const movement = await service.registerMovement({ ...baseDto, type: MovementType.ADJUSTMENT, quantity: 30 });
      expect(movement.stockAfter).to.equal(30);
    });

    it('lanza NotFoundError si el insumo no existe', async () => {
      (MedicalSupply.findByPk as sinon.SinonStub).resolves(null);
      try {
        await service.registerMovement(baseDto);
        expect.fail('Debió lanzar NotFoundError');
      } catch (err) { expect(err).to.be.instanceOf(NotFoundError); }
    });
  });

  // ── getValuationReport ────────────────────────────────────────────────────
  describe('getValuationReport()', () => {
    it('calcula el valor total del inventario correctamente', async () => {
      sandbox.stub(MedicalSupply, 'findAll').resolves([
        { currentStock: 10, unitCost: 50.00, category: SupplyCategory.CONSUMABLE },
        { currentStock: 5, unitCost: 200.00, category: SupplyCategory.MEDICATION },
      ] as any);
      const report = await service.getValuationReport();
      expect(report.total).to.equal(1500); // 500 + 1000
      expect(report.byCategory[SupplyCategory.CONSUMABLE].value).to.equal(500);
      expect(report.byCategory[SupplyCategory.MEDICATION].value).to.equal(1000);
    });

    it('retorna 0 si no hay insumos activos', async () => {
      sandbox.stub(MedicalSupply, 'findAll').resolves([]);
      const report = await service.getValuationReport();
      expect(report.total).to.equal(0);
      expect(Object.keys(report.byCategory)).to.have.length(0);
    });
  });

  // ── getLowStockReport ─────────────────────────────────────────────────────
  describe('getLowStockReport()', () => {
    it('retorna lista de insumos con stock bajo', async () => {
      sandbox.stub(MedicalSupply, 'findAll').resolves([
        { ...makeMockSupply(), currentStock: 3, sku: 'LOW' },
        { ...makeMockSupply(), currentStock: 0, sku: 'OUT' },
      ] as any);
      const result = await service.getLowStockReport();
      expect(result).to.have.length(2);
    });
  });
});
