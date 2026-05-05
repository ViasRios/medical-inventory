import { expect } from 'chai';
import { AlertService, AlertLevel } from '../../src/modules/alerts/alert.service';
import { SupplyCategory, StorageCondition } from '../../src/modules/inventory/models/medical-supply.model';

const mockSupply = (overrides: object = {}) => ({
  id: 'supply-uuid-001', sku: 'GAS001', name: 'Gasas Estériles',
  unit: 'caja', minStock: 10, criticalStock: 5, ...overrides,
} as any);

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => { service = new AlertService(); });

  describe('checkStockLevel()', () => {
    it('genera alerta CRITICAL cuando stock es 0', async () => {
      const alert = await service.checkStockLevel(mockSupply(), 0);
      expect(alert).to.not.be.null;
      expect(alert!.level).to.equal(AlertLevel.CRITICAL);
      expect(alert!.message).to.include('SIN STOCK');
    });

    it('genera alerta CRITICAL cuando stock <= criticalStock', async () => {
      const alert = await service.checkStockLevel(mockSupply({ criticalStock: 5 }), 3);
      expect(alert!.level).to.equal(AlertLevel.CRITICAL);
      expect(alert!.currentStock).to.equal(3);
    });

    it('genera alerta WARNING cuando criticalStock < stock <= minStock', async () => {
      const alert = await service.checkStockLevel(mockSupply({ minStock: 10, criticalStock: 5 }), 8);
      expect(alert!.level).to.equal(AlertLevel.WARNING);
      expect(alert!.message).to.include('Stock bajo');
    });

    it('retorna null y limpia alerta cuando stock es normal', async () => {
      const supply = mockSupply();
      await service.checkStockLevel(supply, 3);
      expect(service.getActiveAlerts()).to.have.length(1);
      const alert = await service.checkStockLevel(supply, 50);
      expect(alert).to.be.null;
      expect(service.getActiveAlerts()).to.have.length(0);
    });

    it('guarda info correcta del insumo en la alerta', async () => {
      const alert = await service.checkStockLevel(mockSupply(), 2);
      expect(alert!.supplyId).to.equal('supply-uuid-001');
      expect(alert!.sku).to.equal('GAS001');
      expect(alert!.triggeredAt).to.be.instanceOf(Date);
    });
  });

  describe('getActiveAlerts()', () => {
    it('retorna alertas ordenadas: CRITICAL primero', async () => {
      const s1 = mockSupply({ id: 'a', sku: 'S1' });
      const s2 = mockSupply({ id: 'b', sku: 'S2' });
      await service.checkStockLevel(s1, 8);   // WARNING
      await service.checkStockLevel(s2, 2);   // CRITICAL
      const alerts = service.getActiveAlerts();
      expect(alerts[0].level).to.equal(AlertLevel.CRITICAL);
      expect(alerts[1].level).to.equal(AlertLevel.WARNING);
    });

    it('retorna lista vacía si no hay alertas', () => {
      expect(service.getActiveAlerts()).to.deep.equal([]);
    });
  });

  describe('getAlertsByLevel()', () => {
    it('filtra alertas por nivel correctamente', async () => {
      const s1 = mockSupply({ id: 'x1', sku: 'X1' });
      const s2 = mockSupply({ id: 'x2', sku: 'X2' });
      const s3 = mockSupply({ id: 'x3', sku: 'X3', criticalStock: 2 });
      await service.checkStockLevel(s1, 0);   // CRITICAL
      await service.checkStockLevel(s2, 7);   // WARNING
      await service.checkStockLevel(s3, 4);   // WARNING
      expect(service.getAlertsByLevel(AlertLevel.CRITICAL)).to.have.length(1);
      expect(service.getAlertsByLevel(AlertLevel.WARNING)).to.have.length(2);
    });
  });

  describe('clearAlert()', () => {
    it('elimina una alerta específica', async () => {
      await service.checkStockLevel(mockSupply(), 2);
      expect(service.getActiveAlerts()).to.have.length(1);
      service.clearAlert('supply-uuid-001');
      expect(service.getActiveAlerts()).to.have.length(0);
    });

    it('no falla al limpiar una alerta inexistente', () => {
      expect(() => service.clearAlert('non-existent')).to.not.throw();
    });
  });
});
