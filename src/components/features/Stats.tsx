import React from 'react';
import { Sale } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface StatsProps {
  sales: Sale[];
}

const Stats: React.FC<StatsProps> = ({ sales }) => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Statistiques</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produits les plus vendus</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart implementation will go here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Stats;