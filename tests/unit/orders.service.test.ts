import { expect } from 'chai';
import sinon from 'sinon';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { PurchaseOrder, OrderStatus } from '../../src/modules/orders/models/purchase-order.model';
import { OrderItem } from '../../src/modules/orders/models/order-item.model';
import { Supplier } from '../../src/modules/suppliers/models/supplier.model';
import { MedicalSupply } from '../../src/modules/inventory/models/medical-supply.model';
import { sequelize } from '../../src/shared/database/connection';
import { ConflictError, NotFoundError } from '../../src/shared/middleware/error.middleware';

describe('OrdersService', () => {
  let service: OrdersService;
  let sandbox: sinon.SinonSandbox;

  const mockTx = { commit: sinon.stub().resolves(), rollback: sinon.stub().resolves() };

  const mockOrder = (status = OrderStatus.PENDING) => ({
    id: 'order-001', orderNumber: 'OC-2024-0001',
    supplierId: 'sup-001', status, totalAmount: 500,
    items: [{ id: 'item-001', supplyId: 'inv-001', quantityOrdered: 10, quantityReceived: 0, unitPrice: 50 }],
    update: sinon.stub().resolvesThis(),
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    service = new OrdersService();
    sandbox.stub(sequelize, 'transaction').resolves(mockTx as any);
    sandbox.stub(PurchaseOrder, 'count').resolves(0);
  });

  afterEach(() => { sandbox.restore(); sinon.reset(); });

  describe('createOrder()', () => {
    it('crea orden con número secuencial correcto', async () => {
      sandbox.stub(Supplier, 'findByPk').resolves({ id: 'sup-001', active: true } as any);
      sandbox.stub(MedicalSupply, 'findByPk').resolves({ id: 'inv-001' } as any);
      sandbox.stub(PurchaseOrder, 'create').resolves({ id: 'order-001' } as any);
      sandbox.stub(OrderItem, 'bulkCreate').resolves([]);
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(mockOrder() as any);

      const result = await service.createOrder(
        { supplierId: 'sup-001', items: [{ supplyId: 'inv-001', quantityOrdered: 10, unitPrice: 50 }] },
        'user-001'
      );
      expect(result.orderNumber).to.equal('OC-2024-0001');
    });

    it('calcula totalAmount con descuento correctamente', async () => {
      sandbox.stub(Supplier, 'findByPk').resolves({ id: 'sup-001', active: true } as any);
      sandbox.stub(MedicalSupply, 'findByPk').resolves({ id: 'inv-001' } as any);
      const createStub = sandbox.stub(PurchaseOrder, 'create').resolves({ id: 'o1' } as any);
      sandbox.stub(OrderItem, 'bulkCreate').resolves([]);
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(mockOrder() as any);

      await service.createOrder(
        { supplierId: 'sup-001', items: [{ supplyId: 'inv-001', quantityOrdered: 10, unitPrice: 100, discount: 10 }] },
        'user-001'
      );
      const callData = createStub.firstCall.args[0] as any;
      expect(callData.totalAmount).to.equal(900); // 10*100*(1-0.10)
    });

    it('lanza NotFoundError si el proveedor no existe', async () => {
      sandbox.stub(Supplier, 'findByPk').resolves(null);
      try {
        await service.createOrder({ supplierId: 'bad', items: [{ supplyId: 'x', quantityOrdered: 1, unitPrice: 10 }] }, 'u1');
        expect.fail('Debió lanzar NotFoundError');
      } catch (err) { expect(err).to.be.instanceOf(NotFoundError); }
    });
  });

  describe('approveOrder()', () => {
    it('cambia estado a CONFIRMED y registra aprobador', async () => {
      const order = mockOrder(OrderStatus.PENDING);
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(order as any);
      await service.approveOrder('order-001', 'manager-001');
      const args = (order.update as sinon.SinonStub).firstCall.args[0];
      expect(args.status).to.equal(OrderStatus.CONFIRMED);
      expect(args.approvedBy).to.equal('manager-001');
    });

    it('lanza ConflictError si la orden ya está confirmada', async () => {
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(mockOrder(OrderStatus.CONFIRMED) as any);
      try {
        await service.approveOrder('order-001', 'mgr');
        expect.fail('Debió lanzar ConflictError');
      } catch (err) { expect(err).to.be.instanceOf(ConflictError); }
    });
  });

  describe('cancelOrder()', () => {
    it('cancela una orden pendiente', async () => {
      const order = mockOrder(OrderStatus.PENDING);
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(order as any);
      await service.cancelOrder('order-001', 'admin');
      const args = (order.update as sinon.SinonStub).firstCall.args[0];
      expect(args.status).to.equal(OrderStatus.CANCELLED);
    });

    it('lanza ConflictError al cancelar una orden recibida', async () => {
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(mockOrder(OrderStatus.RECEIVED) as any);
      try {
        await service.cancelOrder('order-001', 'admin');
        expect.fail('Debió lanzar ConflictError');
      } catch (err) { expect(err).to.be.instanceOf(ConflictError); }
    });

    it('lanza ConflictError al cancelar una orden ya cancelada', async () => {
      sandbox.stub(PurchaseOrder, 'findByPk').resolves(mockOrder(OrderStatus.CANCELLED) as any);
      try {
        await service.cancelOrder('order-001', 'admin');
        expect.fail('Debió lanzar ConflictError');
      } catch (err) { expect(err).to.be.instanceOf(ConflictError); }
    });
  });
});
