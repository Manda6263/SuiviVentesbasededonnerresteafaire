import React, { useState, useContext } from 'react';
import { Users, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { DataContext } from '../../App';
import { useNotification } from '../ui/NotificationContainer';
import { clearAllData } from '../../utils/storage';

const Admin: React.FC = () => {
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const { refreshData } = useContext(DataContext);
  const { showNotification } = useNotification();

  const handleClearData = () => {
    const confirmed = window.confirm(
      "⚠️ ATTENTION !\n\n" +
      "Vous êtes sur le point de supprimer définitivement toutes les données de l'application.\n" +
      "Cette action est irréversible.\n\n" +
      "Êtes-vous absolument sûr de vouloir continuer ?"
    );

    if (confirmed) {
      const doubleConfirmed = window.confirm(
        "⚠️ DERNIÈRE CONFIRMATION !\n\n" +
        "Toutes les données seront effacées :\n" +
        "- Ventes\n" +
        "- Stock\n" +
        "- Historique\n\n" +
        "Tapez 'SUPPRIMER' pour confirmer."
      );

      if (doubleConfirmed) {
        try {
          clearAllData();
          refreshData();
          showNotification('success', 'Toutes les données ont été supprimées');
        } catch (error) {
          showNotification('error', 'Erreur lors de la suppression des données');
        }
      }
    }
  };

  const toggleReadOnlyMode = () => {
    setReadOnlyMode(!readOnlyMode);
    showNotification(
      'info',
      `Mode lecture seule ${!readOnlyMode ? 'activé' : 'désactivé'}`
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des accès
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Mode lecture seule</h3>
                <p className="text-sm text-gray-500">
                  Restreint l'accès en lecture seule pour tous les utilisateurs
                </p>
              </div>
              <Button
                variant={readOnlyMode ? 'primary' : 'outline'}
                icon={<Lock className="h-4 w-4" />}
                onClick={toggleReadOnlyMode}
              >
                {readOnlyMode ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Zone dangereuse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="font-medium text-red-900 mb-2">
                Réinitialisation des données
              </h3>
              <p className="text-sm text-red-600 mb-4">
                Cette action supprimera définitivement toutes les données de l'application.
                Cette opération est irréversible.
              </p>
              <Button
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={handleClearData}
              >
                Réinitialiser toutes les données
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;