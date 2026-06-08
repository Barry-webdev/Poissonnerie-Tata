import React from 'react'
import logoTata from '/logo.jpeg'
import {
  LayoutDashboard, Package, ShoppingCart, CreditCard,
  Users, Thermometer, AlertTriangle, Settings,
  ChevronRight, LogOut, BarChart2,
} from 'lucide-react'
import type { SidebarProps } from '../types/pos'

const ALL_NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard, roles: ['gerant', 'admin'] },
  { id: 'catalogue',  label: 'Catalogue Produits', icon: Package,        roles: ['gerant', 'admin', 'caissier'] },
  { id: 'ventes',     label: 'Ventes',             icon: ShoppingCart,   roles: ['gerant', 'admin', 'caissier'] },
  { id: 'caisse',     label: 'Caisse Journalière', icon: CreditCard,     roles: ['gerant', 'admin'] },
  { id: 'clients',    label: 'Clients & Crédits',  icon: Users,          roles: ['gerant', 'admin', 'caissier'] },
  { id: 'frigo',      label: 'Stock Frigo',        icon: Thermometer,    roles: ['gerant', 'admin'] },
  { id: 'avaries',    label: 'Avaries & Pertes',   icon: AlertTriangle,  roles: ['gerant', 'admin'] },
  { id: 'rapports',   label: 'Rapports',           icon: BarChart2,      roles: ['gerant', 'admin'] },
  { id: 'parametres', label: 'Paramètres',         icon: Settings,       roles: ['gerant', 'admin'] },
]

export function Sidebar({ activeView, setActiveView, userProfile, onLogout }: SidebarProps) {
  // Filtrer les éléments de navigation selon le rôle de l'utilisateur
  const userRole = userProfile?.role ?? 'caissier'
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole))
  const initiales = userProfile?.displayName
    ? userProfile.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AT'

  return (
    <aside className="flex flex-col bg-[#1A365D] shrink-0" style={{ width: 220 }}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#2A4A7F]">
        <img src={logoTata} alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow shrink-0" />
        <div>
          <p className="text-slate-300 text-[10px] font-medium leading-none mb-0.5">Poissonnerie</p>
          <p className="text-[#ECC94B] font-extrabold text-sm leading-none tracking-widest">TATA</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer text-left
              ${activeView === id
                ? 'bg-[#ECC94B] text-[#1A365D] font-bold shadow'
                : 'text-slate-300 hover:bg-[#2A4A7F] hover:text-white'}`}
          >
            <Icon size={15} />
            <span className="flex-1">{label}</span>
            {activeView === id && <ChevronRight size={12} />}
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-[#2A4A7F] flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[#2A4A7F] flex items-center justify-center text-[10px] text-[#ECC94B] font-bold shrink-0">
          {initiales}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[11px] font-semibold truncate">{userProfile?.displayName ?? 'Utilisateur'}</p>
          <p className="text-slate-400 text-[10px] truncate capitalize">{userProfile?.role ?? 'caissier'}</p>
        </div>
        <button onClick={onLogout} title="Déconnexion" className="text-slate-400 hover:text-white cursor-pointer transition-colors">
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
