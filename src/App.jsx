import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Hammer, 
  User, 
  FileText, 
  Settings, 
  Hash, 
  Calendar, 
  Percent, 
  MessageSquare 
} from 'lucide-react';

// Importación directa de librerías instaladas vía NPM
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export default function App() {
  const companyName = "Ebanistería A&B";
  const location = "Puerto Plata, República Dominicana";

  // --- ESTADOS ---
  const [clientInfo, setClientInfo] = useState({
    name: '',
    quoteNumber: `COT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    date: new Date().toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  });

  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, unitPrice: 0 }
  ]);

  const [notes, setNotes] = useState(['']);
  const [includeITBIS, setIncludeITBIS] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- LÓGICA DE NEGOCIO ---
  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClientInfo(prev => ({ ...prev, [name]: value }));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: newId, description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const addNote = () => setNotes([...notes, '']);
  const updateNote = (index, value) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    setNotes(newNotes);
  };
  const removeNote = (index) => {
    if (notes.length > 1) setNotes(notes.filter((_, i) => i !== index));
  };

  const stats = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const itbisAmount = includeITBIS ? subtotal * 0.18 : 0;
    const total = subtotal + itbisAmount;
    return { subtotal, itbisAmount, total };
  }, [items, includeITBIS]);

  // --- GENERACIÓN DE PDF ---
  const exportToPDF = async () => {
    setIsGenerating(true);
    
    const doc = new jsPDF();
    
    // Configuración de Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(companyName.toUpperCase(), 15, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${location}  |  Fecha: ${clientInfo.date}`, 15, 32);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 38, 195, 38);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN", 15, 50);
    
    doc.setFontSize(12);
    doc.text("CLIENTE:", 15, 65);
    doc.setFont("helvetica", "normal");
    doc.text(clientInfo.name || "__________________________", 40, 65);

    // Tabla de productos usando autoTable
    const tableData = items.map(item => [
      item.quantity.toString(),
      item.description,
      `RD$ ${item.unitPrice.toLocaleString()}`,
      `RD$ ${(item.quantity * item.unitPrice).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['CANT.', 'DESCRIPCIÓN', 'PRECIO UNIT.', 'TOTAL']],
      body: tableData,
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      styles: { cellPadding: 5, fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 15, right: 15 }
    });

    // Sección de totales
    let currentY = doc.lastAutoTable.finalY + 15;
    const totalX = 140;

    doc.setFontSize(10);
    doc.text(`Subtotal:`, totalX, currentY);
    doc.text(`RD$ ${stats.subtotal.toLocaleString()}`, 195, currentY, { align: 'right' });
    
    if (includeITBIS) {
      currentY += 7;
      doc.text(`ITBIS (18%):`, totalX, currentY);
      doc.text(`RD$ ${stats.itbisAmount.toLocaleString()}`, 195, currentY, { align: 'right' });
    }

    currentY += 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL:`, totalX, currentY);
    doc.text(`RD$ ${stats.total.toLocaleString()}`, 195, currentY, { align: 'right' });

    // Sección de notas
    const activeNotes = notes.filter(n => n.trim() !== '');
    if (activeNotes.length > 0) {
      currentY += 20;
      doc.setDrawColor(240, 240, 240);
      doc.line(15, currentY - 8, 195, currentY - 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text("NOTAS Y CONDICIONES:", 15, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      let noteY = currentY + 7;
      
      activeNotes.forEach(note => {
        const splitNote = doc.splitTextToSize(`• ${note}`, 180);
        if (noteY + (splitNote.length * 5) > 280) {
          doc.addPage();
          noteY = 20;
        }
        doc.text(splitNote, 15, noteY);
        noteY += (splitNote.length * 5);
      });
    }

    doc.save(`Cotizacion_${clientInfo.name || 'Ebanisteria_AB'}.pdf`);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-4">
            <div className="bg-amber-800 p-3 rounded-2xl text-white shadow-lg shadow-amber-100">
              <Hammer size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-800">{companyName.toUpperCase()}</h1>
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-widest mt-1">
                <span className="w-8 h-px bg-amber-800"></span>
                Puerto Plata, RD
              </div>
            </div>
          </div>
          <button 
            onClick={exportToPDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl disabled:opacity-50"
          >
            <Download size={20} />
            {isGenerating ? 'GENERANDO...' : 'DESCARGAR COTIZACIÓN'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel Lateral */}
          <section className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
              <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
                <User size={18} className="text-amber-800" />
                <h2 className="font-bold text-neutral-700 uppercase tracking-tight text-sm">Información del Cliente</h2>
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block tracking-widest">Nombre del Cliente</label>
                <input 
                  type="text" 
                  name="name"
                  value={clientInfo.name}
                  onChange={handleClientChange}
                  placeholder="Ej. Manuel García"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-amber-800 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
              <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
                <Settings size={18} className="text-amber-800" />
                <h2 className="font-bold text-neutral-700 uppercase tracking-tight text-sm">Ajustes</h2>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <Percent size={20} className="text-neutral-400" />
                    <span className="text-sm font-bold text-neutral-600">Incluir ITBIS (18%)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={includeITBIS}
                      onChange={() => setIncludeITBIS(!includeITBIS)}
                    />
                    <div className="w-12 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-800"></div>
                  </label>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block tracking-widest text-orange-600">No. Interno (No sale en PDF)</label>
                    <div className="relative">
                      <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input 
                        type="text" 
                        name="quoteNumber"
                        value={clientInfo.quoteNumber}
                        onChange={handleClientChange}
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-bold opacity-60"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-neutral-400 uppercase mb-2 block tracking-widest">Fecha de Emisión</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input 
                        type="text" 
                        name="date"
                        value={clientInfo.date}
                        onChange={handleClientChange}
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Panel Principal */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-2 text-neutral-700">
                  <FileText size={18} />
                  <h2 className="font-bold uppercase tracking-tight text-sm">Detalle del Trabajo</h2>
                </div>
                <button 
                  onClick={addItem}
                  className="text-xs flex items-center gap-1.5 text-white bg-amber-800 hover:bg-amber-900 font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-100"
                >
                  <Plus size={14} /> AGREGAR TRABAJO
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-400 text-[10px] uppercase tracking-[0.2em] font-black">
                      <th className="px-6 py-4 w-24">Cant.</th>
                      <th className="px-6 py-4">Descripción del Servicio</th>
                      <th className="px-6 py-4 w-36">Precio Unit.</th>
                      <th className="px-6 py-4 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="px-6 py-4">
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full bg-transparent border-b-2 border-transparent focus:border-amber-800 outline-none text-center font-bold"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            value={item.description}
                            placeholder="Ej. Gabinetes de Cocina en Roble"
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full bg-transparent border-b-2 border-transparent focus:border-amber-800 outline-none"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100">
                            <span className="text-neutral-400 font-bold mr-1">$</span>
                            <input 
                              type="number" 
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent outline-none font-bold text-right"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-neutral-200 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notas */}
              <div className="p-6 bg-neutral-50/30 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <MessageSquare size={16} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Notas Adicionales</h3>
                  </div>
                  <button onClick={addNote} className="text-[10px] font-bold text-amber-800 hover:underline">
                    + AÑADIR NOTA
                  </button>
                </div>
                <div className="space-y-3">
                  {notes.map((note, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text"
                        value={note}
                        placeholder="Ej. 50% de inicial para comenzar el trabajo..."
                        onChange={(e) => updateNote(idx, e.target.value)}
                        className="flex-1 bg-white border border-neutral-200 px-4 py-2 rounded-xl text-sm focus:ring-1 focus:ring-amber-800 outline-none"
                      />
                      <button onClick={() => removeNote(idx)} className="text-neutral-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen Final */}
              <div className="p-8 flex flex-col items-end bg-neutral-900 text-white">
                <div className="space-y-2 w-full max-w-xs">
                  <div className="flex justify-between text-neutral-400 text-sm">
                    <span>Subtotal:</span>
                    <span className="font-bold">RD$ {stats.subtotal.toLocaleString()}</span>
                  </div>
                  {includeITBIS && (
                    <div className="flex justify-between text-neutral-400 text-sm">
                      <span>ITBIS (18%):</span>
                      <span className="font-bold">RD$ {stats.itbisAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="h-px bg-white/10 my-4"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Total Final</span>
                    <div className="flex items-center gap-1 text-3xl font-black text-amber-500">
                      <span className="text-sm self-start mt-1">RD$</span>
                      <span>{stats.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        
        <footer className="text-center py-12">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            Panel Administrativo — {companyName}
          </p>
        </footer>
      </div>
    </div>
  );
}