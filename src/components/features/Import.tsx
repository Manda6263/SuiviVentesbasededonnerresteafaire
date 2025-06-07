import React, { useState, useCallback, useContext } from 'react';
import { Upload, AlertTriangle, FileSpreadsheet, Check, X, Database, ShoppingCart, Eye, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import Button from '../ui/Button';
import { Sale, StockItem } from '../../types';
import { useNotification } from '../ui/NotificationContainer';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DataContext } from '../../App';
import { importSalesToSupabase, addMultipleStockItemsToSupabase } from '../../utils/supabaseStorage';
import { getSales, getStock, updateStockFromSales } from '../../utils/storage';
import * as XLSX from 'xlsx';

interface ImportProps {
  onImportComplete: () => Promise<void>;
}

type ImportType = 'sales' | 'stock';

interface DuplicateInfo {
  item: Sale | StockItem;
  isDuplicate: boolean;
  shouldKeep: boolean;
}

interface PreviewData {
  type: ImportType;
  data: DuplicateInfo[];
  totalRows: number;
  totalAmount?: number;
  totalQuantity: number;
  duplicatesCount: number;
  invalidRows: { row: number; errors: string[] }[];
}

const Import: React.FC<ImportProps> = ({ onImportComplete }) => {
  const { showNotification } = useNotification();
  const { refreshData } = useContext(DataContext);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importType, setImportType] = useState<ImportType>('sales');
  const [showFullPreview, setShowFullPreview] = useState(false);

  // Fonction pour parser les montants avec gestion des formats européens
  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    let stringValue = value.toString().trim();
    
    // Gérer les tirets longs (–) et les convertir en moins (-)
    stringValue = stringValue.replace(/–/g, '-');
    
    // Supprimer le symbole € et les espaces
    stringValue = stringValue.replace(/€/g, '').replace(/\s/g, '');
    
    // Remplacer les virgules par des points pour les décimales
    stringValue = stringValue.replace(',', '.');
    
    // Parser le nombre (gère les négatifs automatiquement)
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Fonction pour nettoyer et normaliser les en-têtes avec support français/anglais
  const normalizeHeaders = (headers: string[]): Record<string, string> => {
    console.log('En-têtes bruts reçus:', headers);
    
    const normalized: Record<string, string> = {};
    
    // Dictionnaire de mapping flexible pour chaque champ
    const fieldMappings = {
      register: ['caisse', 'register', 'cash_register', 'till', 'pos'],
      product: ['produit', 'product', 'item', 'article', 'nom', 'name'],
      type: ['types', 'type', 'category', 'categorie', 'catégorie'],
      quantity: ['quantité', 'quantite', 'quantity', 'qty', 'qte', 'nb'],
      amount: ['montant', 'amount', 'total', 'prix', 'price', 'value', 'valeur'],
      seller: ['vendeur', 'seller', 'salesperson', 'employee', 'employe', 'employé', 'staff', 'user', 'utilisateur'],
      date: ['date', 'datetime', 'timestamp', 'time']
    };
    
    headers.forEach(header => {
      // Ignorer les colonnes "Unnamed" générées par pandas/Excel
      if (header.startsWith('Unnamed:') || header.startsWith('__EMPTY')) {
        console.log(`Colonne ignorée: ${header}`);
        return;
      }
      
      // Nettoyer l'en-tête: supprimer les espaces en début/fin et convertir en minuscules pour la comparaison
      const cleanHeader = header.trim();
      const lowerHeader = cleanHeader.toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n')
        .replace(/[_\s-]/g, ''); // Supprimer les underscores, espaces et tirets
      
      // Chercher dans chaque mapping pour trouver une correspondance
      for (const [internalField, variations] of Object.entries(fieldMappings)) {
        const found = variations.some(variation => {
          const normalizedVariation = variation.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[ñ]/g, 'n')
            .replace(/[_\s-]/g, '');
          
          return lowerHeader === normalizedVariation || 
                 lowerHeader.includes(normalizedVariation) ||
                 normalizedVariation.includes(lowerHeader);
        });
        
        if (found && !normalized[internalField]) {
          normalized[internalField] = header;
          console.log(`Mappé: ${cleanHeader} → ${internalField}`);
          break;
        }
      }
    });
    
    console.log('Mapping final des en-têtes:', normalized);
    return normalized;
  };

  // Fonction pour détecter et mapper les colonnes de manière flexible
  const detectAndMapColumns = (row: any, headerMapping: Record<string, string>) => {
    const mapped: any = {};
    
    // Utiliser le mapping des en-têtes pour extraire les valeurs
    Object.keys(headerMapping).forEach(internalName => {
      const originalHeader = headerMapping[internalName];
      if (row.hasOwnProperty(originalHeader)) {
        const value = row[originalHeader];
        // Ne mapper que si la valeur n'est pas vide/null/undefined
        if (value !== null && value !== undefined && value !== '') {
          mapped[internalName] = value;
        }
      }
    });

    return mapped;
  };

  const validateSalesData = (data: any[]): { sales: Sale[]; errors: { row: number; errors: string[] }[] } => {
    const errors: { row: number; errors: string[] }[] = [];
    const sales: Sale[] = [];

    if (data.length === 0) {
      console.log('Aucune donnée à valider');
      return { sales, errors };
    }

    console.log('Validation des données de vente, nombre de lignes:', data.length);
    console.log('Première ligne exemple:', data[0]);
    console.log('En-têtes disponibles:', Object.keys(data[0]));

    // Normaliser les en-têtes une seule fois
    const headers = Object.keys(data[0]);
    const headerMapping = normalizeHeaders(headers);
    
    console.log('Mapping final des en-têtes:', headerMapping);

    // Vérifier que les champs obligatoires sont présents (seulement les vraiment requis)
    const requiredFields = ['product', 'quantity', 'amount', 'date'];
    const missingFields = requiredFields.filter(field => !headerMapping[field]);
    
    if (missingFields.length > 0) {
      console.error('Champs manquants dans le fichier:', missingFields);
      
      // Créer un message d'erreur plus informatif
      const frenchFieldNames = {
        'product': 'Produit', 
        'quantity': 'Quantité',
        'amount': 'Montant',
        'date': 'Date'
      };
      
      const missingFrenchFields = missingFields.map(field => frenchFieldNames[field as keyof typeof frenchFieldNames] || field);
      
      errors.push({ 
        row: 1, 
        errors: [`Colonnes manquantes dans le fichier: ${missingFrenchFields.join(', ')}`] 
      });
      return { sales, errors };
    }

    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const mapped = detectAndMapColumns(row, headerMapping);

      console.log(`Ligne ${index + 2} - Données mappées:`, mapped);

      // Validation stricte des champs obligatoires seulement
      if (!mapped.date) {
        rowErrors.push('Date manquante');
      }
      if (!mapped.product) {
        rowErrors.push('Produit manquant');
      }
      if (!mapped.quantity) {
        rowErrors.push('Quantité manquante');
      }
      if (!mapped.amount) {
        rowErrors.push('Montant manquant');
      }

      // Validation des types de données
      if (mapped.quantity && isNaN(Number(mapped.quantity))) {
        rowErrors.push('Quantité invalide');
      }

      if (mapped.amount) {
        const parsedAmount = parseAmount(mapped.amount);
        if (parsedAmount === 0 && mapped.amount.toString().trim() !== '0' && mapped.amount.toString().trim() !== '0,00' && mapped.amount.toString().trim() !== '0,00 €') {
          rowErrors.push('Montant invalide');
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors });
        console.log(`Ligne ${index + 2} - Erreurs:`, rowErrors);
      } else {
        try {
          // Conversion de la date Excel si nécessaire
          let formattedDate: string;
          const dateValue = mapped.date;
          
          if (typeof dateValue === 'number') {
            // Date Excel (nombre de jours depuis 1900)
            const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
            formattedDate = excelDate.toISOString().split('T')[0];
          } else if (dateValue instanceof Date) {
            formattedDate = dateValue.toISOString().split('T')[0];
          } else {
            // Essayer de parser la date string
            const dateStr = dateValue.toString();
            let parsedDate: Date;
            
            // Essayer différents formats de date
            if (dateStr.includes('/')) {
              const dateParts = dateStr.split('/');
              if (dateParts.length === 3) {
                // Assumer DD/MM/YYYY
                const day = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // Les mois commencent à 0
                const year = parseInt(dateParts[2]);
                parsedDate = new Date(year, month, day);
              } else {
                parsedDate = new Date(dateStr);
              }
            } else if (dateStr.includes('-')) {
              const dateParts = dateStr.split('-');
              if (dateParts.length === 3) {
                // Assumer DD-MM-YYYY ou YYYY-MM-DD
                if (dateParts[0].length === 4) {
                  // YYYY-MM-DD
                  parsedDate = new Date(dateStr);
                } else {
                  // DD-MM-YYYY
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]) - 1;
                  const year = parseInt(dateParts[2]);
                  parsedDate = new Date(year, month, day);
                }
              } else {
                parsedDate = new Date(dateStr);
              }
            } else {
              parsedDate = new Date(dateStr);
            }
            
            if (isNaN(parsedDate.getTime())) {
              rowErrors.push('Date invalide');
              errors.push({ row: index + 2, errors: rowErrors });
              return;
            }
            
            formattedDate = parsedDate.toISOString().split('T')[0];
          }

          // Parser le montant avec gestion des formats européens
          const totalAmount = parseAmount(mapped.amount);
          const quantity = Number(mapped.quantity);
          const unitPrice = quantity > 0 ? totalAmount / quantity : 0;

          const sale: Sale = {
            id: crypto.randomUUID(),
            date: formattedDate,
            clientName: 'Client Import',
            productName: mapped.product.toString(),
            quantity,
            unitPrice,
            totalAmount,
            paymentMethod: 'Non spécifié',
            seller: mapped.seller?.toString() || 'Non spécifié',
            register: mapped.register?.toString() || 'Non spécifié',
            category: mapped.type?.toString() || 'Non spécifié',
            notes: '',
          };

          console.log(`Ligne ${index + 2} - Vente créée:`, sale);
          sales.push(sale);
        } catch (error) {
          console.error(`Erreur ligne ${index + 2}:`, error);
          rowErrors.push('Erreur de traitement des données');
          errors.push({ row: index + 2, errors: rowErrors });
        }
      }
    });

    console.log('Validation terminée - Ventes valides:', sales.length, 'Erreurs:', errors.length);
    return { sales, errors };
  };

  const validateStockData = (data: any[]): { stock: StockItem[]; errors: { row: number; errors: string[] }[] } => {
    const errors: { row: number; errors: string[] }[] = [];
    const stock: StockItem[] = [];

    if (data.length === 0) {
      return { stock, errors };
    }

    // Normaliser les en-têtes pour le stock
    const headers = Object.keys(data[0]);
    const headerMapping = normalizeHeaders(headers);

    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const mapped = detectAndMapColumns(row, headerMapping);

      if (!mapped.product) rowErrors.push('Produit manquant');
      if (!mapped.type) rowErrors.push('Type/Catégorie manquant');
      if (!mapped.quantity || isNaN(Number(mapped.quantity))) rowErrors.push('Quantité invalide');

      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors });
      } else {
        const currentStock = Number(mapped.quantity);
        const alertThreshold = Number(row.SeuilAlerte || row.seuilAlerte || row.AlertThreshold) || 5;
        const unitPrice = parseAmount(row.PrixUnitaire || row.prixUnitaire || row.UnitPrice) || 0;
        const subcategory = row.SousType || row.sousType || row.Subcategory || '';

        stock.push({
          id: crypto.randomUUID(),
          name: mapped.product.toString(),
          category: mapped.type.toString(),
          subcategory: subcategory.toString(),
          currentStock,
          alertThreshold,
          initialStock: currentStock,
          unitPrice,
        });
      }
    });

    return { stock, errors };
  };

  const findDuplicates = async (newSales: Sale[]): Promise<DuplicateInfo[]> => {
    const existingSales = await getSales();
    
    return newSales.map(newSale => {
      // Détection de doublon stricte sur les 7 champs
      const isDuplicate = existingSales.some(existingSale => 
        existingSale.date === newSale.date &&
        existingSale.productName === newSale.productName &&
        existingSale.quantity === newSale.quantity &&
        Math.abs(existingSale.totalAmount - newSale.totalAmount) < 0.01 && // Tolérance pour les arrondis
        existingSale.seller === newSale.seller &&
        existingSale.register === newSale.register &&
        existingSale.category === newSale.category
      );

      return {
        item: newSale,
        isDuplicate,
        shouldKeep: !isDuplicate
      };
    });
  };

  const findStockDuplicates = async (newStock: StockItem[]): Promise<DuplicateInfo[]> => {
    const existingStock = await getStock();
    
    return newStock.map(newItem => {
      const isDuplicate = existingStock.some(existingItem => 
        existingItem.name === newItem.name &&
        existingItem.category === newItem.category
      );

      return {
        item: newItem,
        isDuplicate,
        shouldKeep: !isDuplicate
      };
    });
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showNotification('error', 'Le fichier Excel est vide');
          setIsProcessing(false);
          return;
        }

        console.log('Données brutes du fichier Excel:', jsonData.slice(0, 3));
        console.log('En-têtes détectés:', Object.keys(jsonData[0] || {}));

        if (importType === 'sales') {
          const { sales, errors } = validateSalesData(jsonData);
          const duplicateInfo = await findDuplicates(sales);
          const duplicatesCount = duplicateInfo.filter(info => info.isDuplicate).length;

          console.log('Ventes validées:', sales.length);
          console.log('Erreurs de validation:', errors.length);

          setPreviewData({
            type: 'sales',
            data: duplicateInfo,
            totalRows: sales.length,
            totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
            totalQuantity: sales.reduce((sum, sale) => sum + sale.quantity, 0),
            duplicatesCount,
            invalidRows: errors,
          });
        } else {
          const { stock, errors } = validateStockData(jsonData);
          const duplicateInfo = await findStockDuplicates(stock);
          const duplicatesCount = duplicateInfo.filter(info => info.isDuplicate).length;

          setPreviewData({
            type: 'stock',
            data: duplicateInfo,
            totalRows: stock.length,
            totalQuantity: stock.reduce((sum, item) => sum + item.currentStock, 0),
            duplicatesCount,
            invalidRows: errors,
          });
        }

        setIsProcessing(false);
      } catch (error) {
        console.error('Error processing file:', error);
        showNotification('error', 'Erreur lors du traitement du fichier. Vérifiez le format.');
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      showNotification('error', 'Erreur lors de la lecture du fichier');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                 file.type === 'application/vnd.ms-excel' ||
                 file.name.endsWith('.xlsx') ||
                 file.name.endsWith('.xls'))) {
      processExcelFile(file);
    } else {
      showNotification('error', 'Format de fichier non supporté. Utilisez un fichier Excel (.xlsx ou .xls)');
    }
  }, [importType]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  }, [importType]);

  const toggleDuplicateKeep = (index: number) => {
    if (!previewData) return;
    
    const newData = [...previewData.data];
    newData[index].shouldKeep = !newData[index].shouldKeep;
    
    setPreviewData({
      ...previewData,
      data: newData
    });
  };

  const handleImport = async () => {
    if (!previewData) return;

    try {
      const itemsToImport = previewData.data.filter(info => info.shouldKeep);
      
      if (previewData.type === 'sales') {
        const newSales = itemsToImport.map(info => info.item) as Sale[];
        
        // Use the new Supabase import function
        await importSalesToSupabase(newSales);
        
        showNotification('success', `${newSales.length} ventes importées avec succès. Stock mis à jour automatiquement.`);
      } else {
        const newStock = itemsToImport.map(info => info.item) as StockItem[];
        
        // Import stock items to Supabase
        await addMultipleStockItemsToSupabase(newStock);
        
        showNotification('success', `${newStock.length} produits importés avec succès`);
      }

      await refreshData();
      await onImportComplete();
      setPreviewData(null);
      setShowFullPreview(false);
    } catch (error) {
      console.error('Import error:', error);
      showNotification('error', 'Erreur lors de l\'import des données');
    }
  };

  const resetImport = () => {
    setPreviewData(null);
    setShowFullPreview(false);
    setIsProcessing(false);
  };

  const validItemsCount = previewData ? previewData.data.filter(info => info.shouldKeep).length : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Import des données</h1>
      
      <div className="flex gap-4 mb-6">
        <Button
          variant={importType === 'sales' ? 'primary' : 'outline'}
          onClick={() => {
            setImportType('sales');
            resetImport();
          }}
          icon={<ShoppingCart className="h-4 w-4" />}
          className={importType === 'sales' ? 'ring-2 ring-blue-300 shadow-lg' : ''}
        >
          Import Ventes
        </Button>
        <Button
          variant={importType === 'stock' ? 'primary' : 'outline'}
          onClick={() => {
            setImportType('stock');
            resetImport();
          }}
          icon={<Database className="h-4 w-4" />}
          className={importType === 'stock' ? 'ring-2 ring-blue-300 shadow-lg' : ''}
        >
          Import Stock
        </Button>
      </div>

      {!previewData ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {importType === 'sales' ? 'Importer des ventes' : 'Importer du stock'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <p className="text-gray-600 mb-2">
                Glissez-déposez votre fichier Excel ici ou
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" type="button">
                  <Upload className="h-4 w-4 mr-2" />
                  Sélectionner un fichier
                </Button>
              </label>
              {isProcessing && (
                <div className="mt-4">
                  <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <p className="text-sm text-blue-600">Traitement en cours...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Format attendu :</h3>
              {importType === 'sales' ? (
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2 text-blue-600">Colonnes supportées (français ou anglais) :</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-medium text-green-700 mb-2">🇫🇷 Français :</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>• <strong>Produit</strong> (obligatoire)</li>
                        <li>• <strong>Quantité</strong> (obligatoire)</li>
                        <li>• <strong>Montant</strong> (obligatoire)</li>
                        <li>• <strong>Date</strong> (obligatoire)</li>
                        <li>• <strong>Caisse</strong> (optionnel)</li>
                        <li>• <strong>Types</strong> (optionnel)</li>
                        <li>• <strong>Vendeur</strong> (optionnel)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-blue-700 mb-2">🇬🇧 English :</p>
                      <ul className="space-y-1 text-gray-600">
                        <li>• <strong>Product</strong> (required)</li>
                        <li>• <strong>Quantity</strong> (required)</li>
                        <li>• <strong>Amount</strong> (required)</li>
                        <li>• <strong>Date</strong> (required)</li>
                        <li>• <strong>Register</strong> (optional)</li>
                        <li>• <strong>Type</strong> (optional)</li>
                        <li>• <strong>Seller</strong> (optional)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 border-t pt-3">
                    <p>✅ <strong>Ordre libre :</strong> Les colonnes peuvent être dans n'importe quel ordre</p>
                    <p>✅ <strong>Espaces automatiquement supprimés :</strong> "Quantité " → "Quantité"</p>
                    <p>✅ <strong>Colonnes "Unnamed" ignorées :</strong> Les colonnes auto-générées sont ignorées</p>
                    <p>✅ <strong>Montants européens :</strong> "154,00 €", "–45,20 €" supportés</p>
                    <p>✅ <strong>Variations acceptées :</strong> "Vendeur", "Seller", "Employee", "Staff", etc.</p>
                    <p>⚠️ <strong>Doublons :</strong> Détectés si les 7 valeurs sont strictement identiques</p>
                    <p>🔄 <strong>Stock automatique :</strong> Le stock sera mis à jour automatiquement après l'import</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Colonnes requises pour le stock :</p>
                  <div className="grid grid-cols-2 gap-4">
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li><strong>Produit</strong> (nom du produit)</li>
                      <li><strong>Type</strong> (catégorie)</li>
                      <li><strong>Quantite</strong> (stock actuel)</li>
                    </ul>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li><strong>SeuilAlerte</strong> (optionnel)</li>
                      <li><strong>PrixUnitaire</strong> (optionnel)</li>
                      <li><strong>SousType</strong> (optionnel)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Résumé de l'import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Aperçu de l'import
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullPreview(!showFullPreview)}
                    icon={<Eye className="h-4 w-4" />}
                  >
                    {showFullPreview ? 'Masquer' : 'Voir tout'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium">Nombre de lignes</p>
                  <p className="text-2xl font-bold text-blue-800">{previewData.totalRows}</p>
                </div>
                {previewData.type === 'sales' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-medium">CA Total</p>
                    <p className="text-2xl font-bold text-green-800">{formatCurrency(previewData.totalAmount || 0)}</p>
                  </div>
                )}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-600 font-medium">Quantité totale</p>
                  <p className="text-2xl font-bold text-purple-800">{previewData.totalQuantity}</p>
                </div>
                <div className={`p-4 rounded-lg border ${
                  previewData.invalidRows.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    previewData.invalidRows.length > 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>Erreurs</p>
                  <p className={`text-2xl font-bold ${
                    previewData.invalidRows.length > 0 ? 'text-red-800' : 'text-gray-800'
                  }`}>{previewData.invalidRows.length}</p>
                </div>
              </div>

              {/* Alertes */}
              {previewData.invalidRows.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-red-600 mb-3">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="font-medium">
                      {previewData.invalidRows.length} ligne(s) invalide(s) détectée(s)
                    </h3>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg max-h-32 overflow-y-auto">
                    <ul className="space-y-1">
                      {previewData.invalidRows.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">
                          <span className="font-medium">Ligne {error.row}:</span>{' '}
                          {error.errors.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {previewData.duplicatesCount > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-amber-600 mb-3">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="font-medium">
                      {previewData.duplicatesCount} doublon(s) détecté(s)
                    </h3>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <p className="text-sm text-amber-700 mb-2">
                      Vous pouvez choisir de conserver ou supprimer chaque doublon individuellement.
                    </p>
                  </div>
                </div>
              )}

              {/* Note sur la mise à jour automatique du stock */}
              {previewData.type === 'sales' && validItemsCount > 0 && (
                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>📦 Mise à jour automatique du stock :</strong> Après l'import, le stock sera automatiquement mis à jour pour chaque produit vendu. Les quantités vendues seront déduites du stock actuel.
                    </p>
                  </div>
                </div>
              )}

              {/* Aperçu des données avec gestion des doublons */}
              <div>
                <h3 className="font-medium mb-3">
                  Aperçu des données {showFullPreview ? '(toutes les lignes)' : '(5 premières lignes)'}
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                          {previewData.type === 'sales' ? (
                            <>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qté</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendeur</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caisse</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seuil</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(showFullPreview ? previewData.data : previewData.data.slice(0, 5)).map((info, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${
                            info.isDuplicate ? 'bg-amber-50' : ''
                          } ${!info.shouldKeep ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={info.shouldKeep}
                                  onChange={() => toggleDuplicateKeep(showFullPreview ? index : index)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {info.isDuplicate && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    Doublon
                                  </span>
                                )}
                              </div>
                            </td>
                            {previewData.type === 'sales' ? (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate((info.item as Sale).date)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {(info.item as Sale).productName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as Sale).quantity}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency((info.item as Sale).totalAmount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as Sale).seller}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as Sale).register}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as Sale).category}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {(info.item as StockItem).name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as StockItem).category}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as StockItem).currentStock}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {(info.item as StockItem).alertThreshold}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency((info.item as StockItem).unitPrice)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!showFullPreview && previewData.data.length > 5 && (
                    <div className="bg-gray-50 px-4 py-2 text-center">
                      <p className="text-sm text-gray-500">
                        Et {previewData.data.length - 5} autres lignes... 
                        <button 
                          onClick={() => setShowFullPreview(true)}
                          className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Voir tout
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={resetImport}
                icon={<X className="h-4 w-4" />}
              >
                Annuler
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Export preview data for verification
                    const dataStr = JSON.stringify(previewData.data.map(info => info.item), null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `preview-${importType}-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  icon={<Download className="h-4 w-4" />}
                >
                  Exporter l'aperçu
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  icon={<Check className="h-4 w-4" />}
                  disabled={previewData.invalidRows.length > 0 || validItemsCount === 0}
                  className={previewData.invalidRows.length > 0 || validItemsCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Confirmer l'import ({validItemsCount} éléments)
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Import;