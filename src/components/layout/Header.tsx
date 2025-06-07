import React from 'react';
import { BarChart, ShoppingCart, Package, Download, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

interface HeaderProps {
  currentPage: string;
  onNavigate: (path: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { user, signOut } = useAuth();

  const navItems = [
    { name: 'Tableau de bord', path: 'dashboard', icon: <BarChart className="h-5 w-5" /> },
    { name: 'Ventes', path: 'sales', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Stock', path: 'stock', icon: <Package className="h-5 w-5" /> },
    { name: 'Import', path: 'import', icon: <Download className="h-5 w-5" /> },
    { name: 'Admin', path: 'admin', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-blue-800 text-white shadow-lg flex flex-col">
      <div className="p-6 flex-1">
        <div className="flex items-center space-x-3 mb-8">
          <BarChart className="h-8 w-8" />
          <h1 className="text-xl font-bold">SuiviVente</h1>
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.path
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700/50'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* User section at bottom */}
      <div className="p-6 border-t border-blue-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.email}
            </p>
            <p className="text-xs text-blue-200">
              Connecté
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          icon={<LogOut className="h-4 w-4" />}
          className="w-full border-blue-600 text-blue-100 hover:bg-blue-700 hover:border-blue-500"
        >
          Déconnexion
        </Button>
      </div>
    </aside>
  );
};

export default Header;