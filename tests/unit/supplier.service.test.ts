import { expect } from 'chai';
import sinon from 'sinon';
import { SupplierService } from '../../src/modules/suppliers/supplier.service';
import { Supplier } from '../../src/modules/suppliers/models/supplier.model';
import { MedicalSupply } from '../../src/modules/inventory/models/medical-supply.model';
import { ConflictError, NotFoundError } from '../../src/shared/middleware/error.middleware';
import { Op } from 'sequelize';

describe('SupplierService', () => {
  let service: SupplierService;
  let sandbox: sinon.SinonSandbox;

  const mockSupplier = () => ({
    id: 'sup-001', name: 'MedPharma', rfc: 'MED201012AB1',
    contactName: 'Juan', phone: '5512345678', email: 'j@med.mx', active: true,
    update: sinon.stub().resolvesThis(),
  });

  const validDto = { name: 'MedPharma', rfc: 'MED201012AB1', contactName: 'Juan', phone: '5512345678', email: 'j@med.mx' };

  beforeEach(() => { sandbox = sinon.createSandbox(); service = new SupplierService(); });
  afterEach(() => { sandbox.restore(); });

  describe('create()', () => {
    it('crea proveedor correctamente', async () => {
      const sup = mockSupplier();
      sandbox.stub(Supplier, 'findOne').resolves(null);
      sandbox.stub(Supplier, 'create').resolves(sup as any);
      const result = await service.create(validDto);
      expect(result.name).to.equal('MedPharma');
    });

    it('normaliza RFC a mayúsculas', async () => {
      sandbox.stub(Supplier, 'findOne').resolves(null);
      const createStub = sandbox.stub(Supplier, 'create').resolves(mockSupplier() as any);
      await service.create({ ...validDto, rfc: 'med201012ab1' });
      expect((createStub.firstCall.args[0] as any).rfc).to.equal('MED201012AB1');
    });

    it('lanza ConflictError si RFC o nombre duplicados', async () => {
      sandbox.stub(Supplier, 'findOne').resolves(mockSupplier() as any);
      try {
        await service.create(validDto);
        expect.fail('Debió lanzar ConflictError');
      } catch (err) { expect(err).to.be.instanceOf(ConflictError); }
    });
  });

  describe('findById()', () => {
    it('retorna proveedor existente', async () => {
      sandbox.stub(Supplier, 'findByPk').resolves({ ...mockSupplier(), supplies: [] } as any);
      const result = await service.findById('sup-001');
      expect(result.id).to.equal('sup-001');
    });

    it('lanza NotFoundError si no existe', async () => {
      sandbox.stub(Supplier, 'findByPk').resolves(null);
      try {
        await service.findById('no-id');
        expect.fail('Debió lanzar NotFoundError');
      } catch (err) { expect(err).to.be.instanceOf(NotFoundError); }
    });
  });

  describe('update()', () => {
    it('actualiza contactName correctamente', async () => {
      const sup = { ...mockSupplier(), update: sinon.stub().resolvesThis() };
      sandbox.stub(Supplier, 'findByPk').resolves(sup as any);
      sandbox.stub(Supplier, 'findOne').resolves(null);
      await service.update('sup-001', { contactName: 'Nuevo Contacto' });
      expect((sup.update as sinon.SinonStub).calledWith({ contactName: 'Nuevo Contacto' })).to.be.true;
    });

    it('lanza ConflictError si el nuevo RFC ya existe en otro proveedor', async () => {
      const sup = { ...mockSupplier(), rfc: 'OLD201012XX1' };
      sandbox.stub(Supplier, 'findByPk').resolves(sup as any);
      sandbox.stub(Supplier, 'findOne').resolves({ id: 'otro' } as any);
      try {
        await service.update('sup-001', { rfc: 'MED201012AB1' });
        expect.fail('Debió lanzar ConflictError');
      } catch (err) { expect(err).to.be.instanceOf(ConflictError); }
    });
  });

  describe('getSupplierStats()', () => {
    it('calcula estadísticas correctamente', async () => {
      sandbox.stub(Supplier, 'findByPk').resolves({ ...mockSupplier(), supplies: [] } as any);
      sandbox.stub(MedicalSupply, 'findAll').resolves([
        { currentStock: 100, unitCost: 10, minStock: 20 },
        { currentStock: 5, unitCost: 200, minStock: 10 },
        { currentStock: 0, unitCost: 50, minStock: 5 },
      ] as any);
      const stats = await service.getSupplierStats('sup-001');
      expect(stats.totalSupplies).to.equal(3);
      expect(stats.totalValue).to.equal(2000); // 1000 + 1000 + 0
      expect(stats.lowStockItems).to.equal(2);
    });
  });

  describe('deactivate()', () => {
    it('desactiva un proveedor existente', async () => {
      const sup = { ...mockSupplier(), update: sinon.stub().resolvesThis() };
      sandbox.stub(Supplier, 'findByPk').resolves(sup as any);
      await service.deactivate('sup-001');
      expect((sup.update as sinon.SinonStub).calledWith({ active: false })).to.be.true;
    });
  });
});
