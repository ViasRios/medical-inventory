import { logger } from '../../shared/utils/logger';

export enum AlertLevel { INFO = 'info', WARNING = 'warning', CRITICAL = 'critical' }

export interface StockAlert {
  supplyId: string; sku: string; name: string; level: AlertLevel;
  currentStock: number; minStock: number; criticalStock: number;
  message: string; triggeredAt: Date;
}

interface SupplyLike {
  id: string; sku: string; name: string; unit: string;
  minStock: number; criticalStock: number;
}

export class AlertService {
  private alerts: Map<string, StockAlert> = new Map();

  async checkStockLevel(supply: SupplyLike, newStock: number): Promise<StockAlert | null> {
    let alert: StockAlert | null = null;
    if (newStock === 0) {
      alert = this.createAlert(supply, newStock, AlertLevel.CRITICAL, 'SIN STOCK - Requiere reorden urgente');
    } else if (newStock <= supply.criticalStock) {
      alert = this.createAlert(supply, newStock, AlertLevel.CRITICAL, `Stock crítico: ${newStock} ${supply.unit} disponibles`);
    } else if (newStock <= supply.minStock) {
      alert = this.createAlert(supply, newStock, AlertLevel.WARNING, `Stock bajo: ${newStock} ${supply.unit}. Considere reabastecer`);
    } else {
      this.alerts.delete(supply.id);
      return null;
    }
    this.alerts.set(supply.id, alert);
    logger.warn(`ALERTA [${alert.level.toUpperCase()}] ${supply.sku}: ${alert.message}`);
    return alert;
  }

  private createAlert(supply: SupplyLike, currentStock: number, level: AlertLevel, message: string): StockAlert {
    return { supplyId: supply.id, sku: supply.sku, name: supply.name, level,
      currentStock, minStock: supply.minStock, criticalStock: supply.criticalStock,
      message, triggeredAt: new Date() };
  }

  getActiveAlerts(): StockAlert[] {
    return Array.from(this.alerts.values()).sort((a, b) => {
      const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2 };
      return order[a.level] - order[b.level];
    });
  }

  getAlertsByLevel(level: AlertLevel): StockAlert[] {
    return this.getActiveAlerts().filter((a) => a.level === level);
  }

  clearAlert(supplyId: string): void { this.alerts.delete(supplyId); }
}
