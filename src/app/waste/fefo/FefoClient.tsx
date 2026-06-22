"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Radar, Plus, AlertTriangle, Clock, CheckCircle2, PackageX } from "lucide-react";
import { toast } from "sonner";
import { addFefoRecord, updateFefoStatus, subtractFefoQty, deleteFefoRecord, editFefoRecord } from "./actions";
import { searchProducts } from "@/app/products/actions";
import { Search, X, Minus, Trash2, Edit2, Check } from "lucide-react";
import { get, set } from "idb-keyval";
import AppSelect from "@/components/dashboard/AppSelect";
import { useProfile } from '@/components/ui/ProfileContext';
import { FEFO_CATEGORIES } from "@/lib/domain/catalogs";

type ProductCatalogEntry = {
  id: string;
  name: string;
  barcode_id: string;
  material_code?: string | null;
  category: string;
  unit: string;
};

type FefoRecord = {
  id: string;
  barcode_id: string;
  product_name: string;
  quantity: number;
  expiration_date: string;
};

type OfflineQueueItem =
  | {
      action: "ADD";
      idempotency_key: string;
      barcode_id: string;
      product_name: string;
      quantity: number;
      expiration_date: string;
      timestamp: number;
    }
  | {
      action: "UPDATE_STATUS";
      id: string;
      newStatus: string;
      timestamp: number;
    };

export default function FefoClient({ records }: { records: FefoRecord[]; profileId: string }) {
  const { profile } = useProfile();
  const operator = profile?.display_name;
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<ProductCatalogEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogEntry | null>(null);

  const [quantity, setQuantity] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("otro");
  const [sortBy, setSortBy] = useState<"criticidad" | "cantidad" | "fecha">("criticidad");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editDate, setEditDate] = useState("");

  const isSupervisor = profile?.role === "supervisor" || profile?.role === "admin";
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const calculateDaysLeft = (expDateStr: string) => {
    const expDate = new Date(expDateStr);
    expDate.setHours(0,0,0,0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  async function handleCatalogSearch(query: string) {
    setCatalogQuery(query);
    const results = query.trim() ? await searchProducts(query) : [];
    setCatalogResults(results);
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || !expirationDate) {
      toast.error("Por favor selecciona un producto y llena los campos requeridos");
      return;
    }

    if (!navigator.onLine) {
      const payload: OfflineQueueItem = {
        action: "ADD",
        idempotency_key: crypto.randomUUID(),
        barcode_id: selectedProduct.barcode_id || Math.random().toString().slice(2, 8),
        product_name: `${selectedProduct.name} ||| ${selectedCategory}`,
        quantity: Number(quantity),
        expiration_date: expirationDate,
        timestamp: Date.now()
      };
      const queue = ((await get("fefoOfflineQueue")) || []) as OfflineQueueItem[];
      queue.push(payload);
      await set("fefoOfflineQueue", queue);
      
      toast.success("Sin conexión: Producto guardado localmente en el radar.");
      setIsAdding(false);
      setSelectedProduct(null);
      setCatalogQuery("");
      setCatalogResults([]);
      setQuantity("");
      setExpirationDate("");
      setSelectedCategory("otro");
      return;
    }

    startTransition(async () => {
      try {
        const res = await addFefoRecord({
          barcode_id: selectedProduct.barcode_id || Math.random().toString().slice(2, 8),
          product_name: `${selectedProduct.name} ||| ${selectedCategory}`,
          quantity: Number(quantity),
          expiration_date: expirationDate,
          operator_name: operator || "",
        });

        if (res.success) {
          toast.success("Producto añadido al radar");
          setIsAdding(false);
          setSelectedProduct(null);
          setCatalogQuery("");
          setCatalogResults([]);
          setQuantity("");
          setExpirationDate("");
          setSelectedCategory("otro");
        } else {
          toast.error(res.error || "Error al añadir");
        }
      } catch {
        toast.error("Error inesperado");
      }
    });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!navigator.onLine) {
      const payload: OfflineQueueItem = {
        action: "UPDATE_STATUS",
        id,
        newStatus,
        timestamp: Date.now()
      };
      const queue = ((await get("fefoOfflineQueue")) || []) as OfflineQueueItem[];
      queue.push(payload);
      await set("fefoOfflineQueue", queue);
      toast.success(`Sin conexión: Actualizado localmente a ${newStatus}`);
      return;
    }

    startTransition(async () => {
      const res = await updateFefoStatus(id, newStatus);
      if (res.success) {
        toast.success(`Producto marcado como ${newStatus}`);
      } else {
        toast.error("Error al actualizar");
      }
    });
  };

  const getAlertColor = (days: number, categoryVal: string) => {
    const catInfo = FEFO_CATEGORIES.find(c => c.value === categoryVal) || FEFO_CATEGORIES.find(c => c.value === "otro");
    const threshold = catInfo ? catInfo.retirementDays : 0;
    const delta = days - threshold;

    if (delta <= 2) return "bg-red-50 border-red-200 text-red-700";
    if (delta <= 4) return "bg-orange-50 border-orange-200 text-orange-700";
    if (delta <= 6) return "bg-amber-50 border-amber-200 text-amber-700";
    if (delta <= 8) return "bg-emerald-50 border-emerald-200 text-emerald-700";
    return "bg-white border-slate-200 text-slate-700";
  };

  const getAlertIcon = (delta: number) => {
    if (delta <= 2) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (delta <= 4) return <Clock className="h-5 w-5 text-orange-600" />;
    if (delta <= 6) return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    if (delta <= 8) return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    return <CheckCircle2 className="h-5 w-5 text-slate-400" />;
  };

  const handleSubtract = async (id: string, currentQty: number) => {
    if (currentQty <= 1) {
      // Si solo queda 1 y se vende, el producto ya no está en el radar
      handleStatusChange(id, "vendido");
      return;
    }
    startTransition(async () => {
      const res = await subtractFefoQty(id);
      if (res.success) {
        toast.success("Unidad descontada (-1)");
      } else {
        toast.error("Error al restar unidad");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este registro del radar?")) return;
    startTransition(async () => {
      const res = await deleteFefoRecord(id);
      if (res.success) toast.success("Registro eliminado");
      else toast.error("Error al eliminar");
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editQty || !editDate) return;
    startTransition(async () => {
      const res = await editFefoRecord(id, { quantity: Number(editQty), expiration_date: editDate });
      if (res.success) {
        toast.success("Registro actualizado");
        setEditingId(null);
      } else {
        toast.error("Error al actualizar");
      }
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50 pb-28 sm:max-w-2xl md:max-w-4xl lg:max-w-5xl px-4 sm:px-6">
      <div className="mb-2 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Link
              href="/waste"
              className="mb-4 text-xs text-zinc-400 underline-offset-2 hover:underline inline-block"
            >
              Volver a Merma
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-red-600">
              <Radar className="h-6 w-6" />
              Radar FEFO
            </h1>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200"
            title={isAdding ? "Cancelar" : "Añadir Producto"}
          >
            {isAdding ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="p-4">
        {isAdding && (
          <form onSubmit={handleAdd} className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-100 mb-6">
            <h2 className="font-bold text-slate-800 mb-4">Rastrear Nuevo Vencimiento</h2>
            <div className="space-y-3">
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 mb-1 block">Producto</label>
                
                {!selectedProduct ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={catalogQuery}
                      onChange={(e) => handleCatalogSearch(e.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      autoComplete="off"
                    />
                    {catalogQuery.trim() && (
                      <div className="absolute z-10 mt-1 w-full rounded-xl bg-white shadow-lg ring-1 ring-black/5 max-h-60 overflow-auto">
                        {catalogResults.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">No se encontraron productos.</div>
                        ) : (
                          <ul className="py-1">
                            {catalogResults.slice(0, 30).map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProduct(p)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none flex flex-col"
                                >
                                  <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                                  <span className="text-[10px] text-slate-400">EAN: {p.barcode_id} {p.material_code ? `• Mat: ${p.material_code}` : ''}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-emerald-800">{selectedProduct.name}</span>
                      <span className="text-[10px] text-emerald-600">EAN: {selectedProduct.barcode_id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setCatalogQuery("");
                        setCatalogResults([]);
                      }}
                      className="text-emerald-600 hover:text-emerald-800 p-1 rounded-full hover:bg-emerald-100 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Categoría FEFO</label>
                <AppSelect
                  label="Categoría FEFO"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  buttonClassName="rounded-xl border-0 px-3 py-2.5 text-sm font-medium text-slate-800 ring-1 ring-slate-200 shadow-none"
                  options={FEFO_CATEGORIES.map((category) => ({
                    value: category.value,
                    label: `${category.label} (Retira a ${category.retirementDays} días)`,
                  }))}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Cantidad</label>
                  <input 
                    type="number" 
                    inputMode="decimal" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    placeholder="Uds" 
                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Vence el</label>
                  <input 
                    type="date" 
                    value={expirationDate} 
                    onChange={e => setExpirationDate(e.target.value)} 
                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isPending}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl mt-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Añadir al Radar"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 md:space-y-0">
          {records.length > 0 && !isAdding && (
            <div className="flex items-center justify-between px-2 mb-4 col-span-full">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {records.length} {records.length === 1 ? 'producto' : 'productos'} en radar
              </span>
              <AppSelect
                label="Orden"
                hideLabel
                value={sortBy}
                onChange={(value) => setSortBy(value as "criticidad" | "cantidad" | "fecha")}
                containerClassName="min-w-[240px]"
                buttonClassName="rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-none"
                panelClassName="right-0 left-auto w-64"
                options={[
                  { value: "criticidad", label: "Ordenar por: Criticidad (Color)" },
                  { value: "fecha", label: "Ordenar por: Fecha Vencimiento" },
                  { value: "cantidad", label: "Ordenar por: Cantidad (Menor a Mayor)" },
                ]}
              />
            </div>
          )}

          {records.length === 0 && !isAdding && (
            <div className="col-span-full text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl">
              <Radar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">El radar está limpio. No hay productos próximos a vencer.</p>
            </div>
          )}

          {[...records].sort((a, b) => {
            if (sortBy === "cantidad") return a.quantity - b.quantity;
            
            const daysA = calculateDaysLeft(a.expiration_date);
            const daysB = calculateDaysLeft(b.expiration_date);
            if (sortBy === "fecha") return daysA - daysB;

            // Sort by criticidad (Delta)
            const catA = a.product_name.split(" ||| ")[1] || "otro";
            const catB = b.product_name.split(" ||| ")[1] || "otro";
            const deltaA = daysA - (FEFO_CATEGORIES.find(c => c.value === catA)?.retirementDays || 0);
            const deltaB = daysB - (FEFO_CATEGORIES.find(c => c.value === catB)?.retirementDays || 0);
            return deltaA - deltaB;
          }).map((rec) => {
            const nameParts = rec.product_name.split(" ||| ");
            const rawName = nameParts[0];
            const categoryVal = nameParts[1] || "otro";

            const daysLeft = calculateDaysLeft(rec.expiration_date);
            const colorClass = getAlertColor(daysLeft, categoryVal);
            
            const catInfo = FEFO_CATEGORIES.find(c => c.value === categoryVal) || FEFO_CATEGORIES.find(c => c.value === "otro");
            const threshold = catInfo ? catInfo.retirementDays : 0;
            const delta = daysLeft - threshold;
            
            return (
              <div key={rec.id} className={`p-4 rounded-2xl border ${colorClass} flex flex-col justify-between`}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                      {getAlertIcon(delta)}
                      <div className="flex flex-col pr-2">
                        <h3 className="font-bold text-sm leading-tight">{rawName}</h3>
                        <span className="text-[10px] uppercase tracking-wide opacity-70 mt-0.5">{catInfo?.label}</span>
                      </div>
                    </div>
                    {isSupervisor && (
                      <div className="flex gap-1 shrink-0 ml-1">
                        <button onClick={() => {
                          if (editingId === rec.id) setEditingId(null);
                          else { setEditingId(rec.id); setEditQty(rec.quantity.toString()); setEditDate(rec.expiration_date.split('T')[0]); }
                        }} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(rec.id)} className="p-1.5 hover:bg-red-200 rounded-lg text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingId === rec.id ? (
                    <div className="pl-7 mb-4 flex gap-2 items-center">
                      <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-16 text-xs px-2 py-1 rounded border border-slate-300" />
                      <span className="text-xs">uds</span>
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-28 text-xs px-2 py-1 rounded border border-slate-300" />
                      <button onClick={() => handleSaveEdit(rec.id)} className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"><Check className="h-4 w-4"/></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 pl-7 mb-2">
                        <span className="text-xs font-black bg-white/50 px-2 py-1 rounded-lg shrink-0">
                          {rec.quantity} uds
                        </span>
                        <div className="text-xs font-semibold opacity-80">
                          {daysLeft < 0 ? `¡Venció hace ${Math.abs(daysLeft)} días!` : 
                           daysLeft === 0 ? "¡Vence HOY!" : 
                           `Vence en ${daysLeft} días (${new Date(rec.expiration_date).toLocaleDateString("es-CO")})`}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2 pl-7 mt-2">
                  {confirmingId === rec.id ? (
                    <>
                      <button 
                        onClick={() => setConfirmingId(null)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/70 hover:bg-white text-zinc-700 font-bold py-2 rounded-xl text-xs transition-colors ring-1 ring-black/5"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          handleStatusChange(rec.id, "mermado");
                          setConfirmingId(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 rounded-xl text-xs transition-colors ring-1 ring-red-200"
                      >
                        <PackageX className="h-3 w-3" /> Sí, confirmar
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleSubtract(rec.id, rec.quantity)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/70 hover:bg-white text-zinc-700 font-bold py-2 rounded-xl text-xs transition-colors ring-1 ring-black/5"
                      >
                        <Minus className="h-3 w-3" /> Vendida (-1)
                      </button>
                      <button 
                        onClick={() => setConfirmingId(rec.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-white/70 hover:bg-white text-red-700 font-bold py-2 rounded-xl text-xs transition-colors ring-1 ring-black/5"
                      >
                        <PackageX className="h-3 w-3" /> Mermar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
