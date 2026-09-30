import React, { useState, useEffect } from 'react';
import { X, Sun, Zap, Battery, Check, AlertCircle } from 'lucide-react';
import { PanelHierarchyItem, InverterHierarchyItem, BatteryHierarchyItem } from '../../types';

export type HardwareType = 'panel' | 'inverter' | 'battery';

interface HardwareItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: HardwareType;
  itemToEdit?: PanelHierarchyItem | InverterHierarchyItem | BatteryHierarchyItem | null;
  existingManufacturers: string[];
  existingSeries: string[];
  onSavePanel?: (item: Omit<PanelHierarchyItem, 'id'>, id?: string) => Promise<void>;
  onSaveInverter?: (item: Omit<InverterHierarchyItem, 'id'>, id?: string) => Promise<void>;
  onSaveBattery?: (item: Omit<BatteryHierarchyItem, 'id'>, id?: string) => Promise<void>;
}

export const HardwareItemEditModal: React.FC<HardwareItemEditModalProps> = ({
  isOpen,
  onClose,
  type,
  itemToEdit,
  existingManufacturers,
  existingSeries,
  onSavePanel,
  onSaveInverter,
  onSaveBattery
}) => {
  // Form state
  const [manufacturer, setManufacturer] = useState('');
  const [series, setSeries] = useState('');
  const [model, setModel] = useState('');

  // Panel specific
  const [panelWatts, setPanelWatts] = useState('440');

  // Inverter specific
  const [inverterKw, setInverterKw] = useState('5.0');

  // Battery specific
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState('13.5');
  const [batteryFormFactor, setBatteryFormFactor] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    if (itemToEdit) {
      setManufacturer(itemToEdit.manufacturer || '');
      setModel(itemToEdit.model || '');

      if (type === 'panel') {
        const p = itemToEdit as PanelHierarchyItem;
        setSeries(p.series || '');
        setPanelWatts(String(p.sizeW || 440));
      } else if (type === 'inverter') {
        const i = itemToEdit as InverterHierarchyItem;
        setSeries(i.series || '');
        setInverterKw(String(i.sizeKw || 5.0));
      } else if (type === 'battery') {
        const b = itemToEdit as BatteryHierarchyItem;
        setSeries(b.series || '');
        setBatteryCapacityKwh(String(b.usableCapacityKwh || 13.5));
        setBatteryFormFactor(b.size || '');
      }
    } else {
      // Defaults for new items
      setManufacturer(existingManufacturers[0] || '');
      setSeries('');
      setModel('');
      if (type === 'panel') {
        setPanelWatts('440');
      } else if (type === 'inverter') {
        setInverterKw('5.0');
      } else if (type === 'battery') {
        setBatteryCapacityKwh('13.5');
        setBatteryFormFactor('Wall Mounted Slimline');
      }
    }
  }, [isOpen, itemToEdit, type, existingManufacturers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanManuf = manufacturer.trim();
    const cleanModel = model.trim();
    const cleanSeries = series.trim();

    if (!cleanManuf) {
      setError('Manufacturer / Brand is required.');
      return;
    }
    if (!cleanModel) {
      setError('Model Number / Description is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (type === 'panel') {
        const wattsNum = Number(panelWatts) || 440;
        if (wattsNum <= 0) throw new Error('Panel Watts must be a positive number.');
        const finalSeries = cleanSeries || `${wattsNum}W High Efficiency`;

        await onSavePanel?.(
          {
            manufacturer: cleanManuf,
            sizeW: wattsNum,
            series: finalSeries,
            model: cleanModel
          },
          itemToEdit?.id
        );
      } else if (type === 'inverter') {
        const kwNum = Number(inverterKw) || 5.0;
        if (kwNum <= 0) throw new Error('Inverter kW must be a positive number.');
        const finalSeries = cleanSeries || `${kwNum}kW Series`;

        await onSaveInverter?.(
          {
            manufacturer: cleanManuf,
            sizeKw: kwNum,
            series: finalSeries,
            model: cleanModel
          },
          itemToEdit?.id
        );
      } else if (type === 'battery') {
        const capNum = Number(batteryCapacityKwh) || 13.5;
        if (capNum <= 0) throw new Error('Battery usable capacity must be a positive number.');
        const finalSeries = cleanSeries || `${capNum}kWh Storage`;
        const finalForm = batteryFormFactor.trim() || `${capNum}kWh Enclosure`;

        await onSaveBattery?.(
          {
            manufacturer: cleanManuf,
            usableCapacityKwh: capNum,
            series: finalSeries,
            model: cleanModel,
            size: finalForm
          },
          itemToEdit?.id
        );
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save hardware item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    const action = itemToEdit ? 'Edit' : 'Add New';
    switch (type) {
      case 'panel':
        return `${action} Solar PV Panel`;
      case 'inverter':
        return `${action} Solar Inverter`;
      case 'battery':
        return `${action} Battery Storage Unit`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'panel':
        return <Sun className="w-5 h-5 text-amber-400" />;
      case 'inverter':
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'battery':
        return <Battery className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#202020] border border-[#303030]">
              {getIcon()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{getTitle()}</h2>
              <p className="text-xs text-gray-400">
                Configure cascading dependent dropdown values for Leads &amp; Projects
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dependent flow banner */}
          <div className="p-3 rounded-xl bg-[#1c1c1c] border border-[#2c2c2c] text-xs text-gray-300">
            <span className="text-[11px] font-mono text-[#bef264] font-bold block mb-1">
              Dependent Dropdown Chain:
            </span>
            {type === 'panel' && (
              <span className="text-gray-300">
                1. Manufacturer &rarr; 2. Watts ({panelWatts || '...'}W) &rarr; 3. Series ({series || '...'}) &rarr; 4. Model Number
              </span>
            )}
            {type === 'inverter' && (
              <span className="text-gray-300">
                1. Manufacturer &rarr; 2. Rated Power ({inverterKw || '...'} kW) &rarr; 3. Series ({series || '...'}) &rarr; 4. Model Number
              </span>
            )}
            {type === 'battery' && (
              <span className="text-gray-300">
                1. Manufacturer &rarr; 2. Usable Capacity ({batteryCapacityKwh || '...'} kWh) &rarr; 3. Series &rarr; 4. Model Number
              </span>
            )}
          </div>

          {/* Manufacturer / Brand */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Manufacturer / Brand <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              list="hardware-manufacturers-list"
              value={manufacturer}
              onChange={e => setManufacturer(e.target.value)}
              placeholder={
                type === 'panel'
                  ? 'e.g. AIKO Solar, Trina Solar, Jinko Solar'
                  : type === 'inverter'
                  ? 'e.g. Fronius, Sungrow, Enphase, GoodWe'
                  : 'e.g. Tesla Powerwall 3, Sungrow SBR, BYD'
              }
              required
              className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors"
            />
            <datalist id="hardware-manufacturers-list">
              {existingManufacturers.map(m => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="text-[11px] text-gray-500 mt-1">
              Select an existing brand or enter a new brand name.
            </p>
          </div>

          {/* Size / Watts / kW / Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type === 'panel' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Power Rating (Watts) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    max="1000"
                    step="5"
                    value={panelWatts}
                    onChange={e => setPanelWatts(e.target.value)}
                    placeholder="440"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors pr-10"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">
                    W
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">e.g. 415, 440, 450, 475, 500</p>
              </div>
            )}

            {type === 'inverter' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Rated Power (kW) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1.0"
                    max="250.0"
                    step="0.1"
                    value={inverterKw}
                    onChange={e => setInverterKw(e.target.value)}
                    placeholder="5.0"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors pr-12"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">
                    kW
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">e.g. 5.0, 6.0, 8.2, 10.0</p>
              </div>
            )}

            {type === 'battery' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Usable Capacity (kWh) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1.0"
                    max="100.0"
                    step="0.1"
                    value={batteryCapacityKwh}
                    onChange={e => setBatteryCapacityKwh(e.target.value)}
                    placeholder="13.5"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors pr-12"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400">
                    kWh
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">e.g. 5.0, 9.6, 13.5, 16.0, 27.0</p>
              </div>
            )}

            {/* Series Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Series Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                list="hardware-series-list"
                value={series}
                onChange={e => setSeries(e.target.value)}
                placeholder={
                  type === 'panel'
                    ? 'e.g. Neostar 2P, Vertex S+, Tiger Neo'
                    : type === 'inverter'
                    ? 'e.g. Primo GEN24 Plus, SG Series'
                    : 'e.g. Powerwall 3, SBR High Voltage'
                }
                required
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors"
              />
              <datalist id="hardware-series-list">
                {existingSeries.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="text-[11px] text-gray-500 mt-1">
                Product family / generation name.
              </p>
            </div>
          </div>

          {/* Model Number / Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Model Number &amp; Description <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={
                type === 'panel'
                  ? 'e.g. AIKO-A440-MAH54Mb (All-Black N-Type ABC)'
                  : type === 'inverter'
                  ? 'e.g. Primo GEN24 5.0 Plus (Single Phase Hybrid Ready)'
                  : 'e.g. Tesla Powerwall 3 Integrated Inverter'
              }
              required
              className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Full specification name saved onto Leads, Proposals, and STC claims.
            </p>
          </div>

          {/* Battery Form Factor / Size (Battery only) */}
          {type === 'battery' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Physical Form Factor / Enclosure Size
              </label>
              <input
                type="text"
                value={batteryFormFactor}
                onChange={e => setBatteryFormFactor(e.target.value)}
                placeholder="e.g. 13.5kWh Wall Mounted Slimline, 3 Modules Tower"
                className="w-full px-3.5 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-xl text-xs text-white placeholder-gray-500 focus:border-[#bef264] outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Mounting profile (Floor Tower, Compact Wall Mount, Outdoor Integrated).
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#2b2b2b] text-xs font-semibold text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#bef264] hover:bg-[#a3e635] text-slate-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Add to Catalog'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
