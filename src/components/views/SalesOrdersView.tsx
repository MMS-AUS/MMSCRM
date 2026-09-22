import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Layers,
  MapPin,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { SalesOrder } from '../../types';

export const SalesOrdersView: React.FC = () => {
  const { salesOrders, updateSalesOrderStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getWarehouse = (so: SalesOrder) =>
    so.warehouseLocation ||
    (so.projectCode?.includes('NSW')
      ? 'Sydney Wetherill Park Logistics Hub'
      : 'Brisbane Acacia Ridge Distribution Hub');

  const filteredOrders = salesOrders.filter(so => {
    const warehouse = getWarehouse(so);
    const matchesSearch =
      (so.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (so.projectCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (so.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || so?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalWarehouseExpense = salesOrders.reduce((acc, so) => acc + (so.totalCostAud || 0), 0);
  const sydneyOrdersCount = salesOrders.filter(so => getWarehouse(so).toLowerCase().includes('sydney')).length;
  const brisbaneOrdersCount = salesOrders.filter(so => getWarehouse(so).toLowerCase().includes('brisbane')).length;

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-4 sm:p-6 space-y-6 text-[#e5e7eb]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Warehouse Sales Orders (Equipment Expense)
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Inventory &amp; Project Costing
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Central warehouse fulfillment tracking hardware bills of materials (BOM), equipment expense, and job dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-[#1e1e1e] border border-[#2d2d2d] text-gray-300 shadow-xs">
            Total Warehouse BOM Expense: <strong className="text-white">${totalWarehouseExpense.toLocaleString()} AUD</strong>
          </span>
        </div>
      </div>

      {/* Warehouse Hubs Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">NSW Central Hub</span>
            <p className="font-bold text-white text-sm mt-0.5">Sydney Wetherill Park Logistics Hub</p>
            <p className="text-xs text-gray-400">Tier-1 Panels, Sungrow &amp; Fronius Stock</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {sydneyOrdersCount} Orders Active
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">QLD Central Hub</span>
            <p className="font-bold text-white text-sm mt-0.5">Brisbane Acacia Ridge Distribution</p>
            <p className="text-xs text-gray-400">High-Voltage Battery Storage &amp; Isolators</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#bef2641a] text-[#bef264] border border-[#bef26433]">
            {brisbaneOrdersCount} Orders Active
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by order number (SO-2026-...), project code, customer..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-[#121212] border border-[#262626] text-white placeholder:text-gray-500 outline-none focus:border-[#bef264]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs font-semibold bg-[#121212] border border-[#262626] text-white rounded-lg px-3 py-2 outline-none w-full sm:w-auto focus:border-[#bef264]"
        >
          <option value="all">All Dispatch Statuses</option>
          <option value="Allocated">Allocated</option>
          <option value="Picking">Picking</option>
          <option value="Dispatched">Dispatched (En Route)</option>
          <option value="Delivered to Site">Delivered to Site</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map(order => {
          const warehouse = getWarehouse(order);
          return (
            <div
              key={order.id}
              className="bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] shadow-xs p-5 space-y-4 hover:border-[#bef264]/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">{order.orderNumber}</span>
                    <span className="text-sm font-bold text-gray-300">&bull; Linked: {order.projectCode}</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        order.status === 'Delivered to Site'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : order.status === 'Dispatched' || order.status === 'Dispatched from Warehouse'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-[#bef2641a] text-[#bef264] border-[#bef26433]'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Customer: <strong className="text-white">{order.customerName}</strong> &bull; Fulfilling Warehouse:{' '}
                    <strong className="text-gray-300">{warehouse}</strong>
                  </p>
                </div>

                {/* Status Selector & Total Cost */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Equipment Cost</span>
                    <span className="text-base font-bold text-[#bef264]">
                      ${(order.totalCostAud || 0).toLocaleString()} AUD
                    </span>
                  </div>

                  <select
                    value={order.status}
                    onChange={e => updateSalesOrderStatus(order.id, e.target.value as any)}
                    className="text-xs font-bold bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 outline-none text-white focus:border-[#bef264]"
                  >
                    <option value="Allocated">Allocated</option>
                    <option value="Picking">Picking</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Dispatched from Warehouse">Dispatched from Warehouse</option>
                    <option value="Delivered to Site">Delivered to Site</option>
                  </select>
                </div>
              </div>

              {/* Bill of Materials Items Breakdown */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#161616] text-gray-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Component / Hardware Description</th>
                      <th className="p-2.5">Model / Part #</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      <th className="p-2.5 text-right">Unit Cost (AUD)</th>
                      <th className="p-2.5 rounded-r-lg text-right">Line Total (AUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {order.items?.map((item, idx) => {
                      const partNumber = item.partNumber || item.sku || `SKU-${idx + 1}`;
                      const unitCost = item.unitCostAud || 0;
                      const lineTotal = item.totalCostAud ?? item.totalAud ?? (item.quantity * unitCost);
                      return (
                        <tr key={item.id || item.sku || idx} className="hover:bg-[#262626]/40 transition-colors">
                          <td className="p-2.5 font-semibold text-white">{item.description}</td>
                          <td className="p-2.5 font-mono text-gray-400">{partNumber}</td>
                          <td className="p-2.5 text-center font-bold text-gray-200">{item.quantity}</td>
                          <td className="p-2.5 text-right text-gray-400">${unitCost.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold text-white">${lineTotal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <span>Dispatched Date: <strong className="text-gray-200">{order.dispatchDate || order.orderDate || 'Pending dispatch'}</strong></span>
                <span className="flex items-center gap-1 text-[#bef264] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled with Project P&amp;L
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
