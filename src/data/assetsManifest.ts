export interface AssetRecord {
  id: string;
  title: string;
  category: 'produce' | 'kitchen' | 'redistribution' | 'sustainability' | 'texture';
  url: string;
  source: string;
  author: string;
  license: string;
  licenseUrl: string;
  description: string;
}

export const ASSET_MANIFEST: AssetRecord[] = [
  {
    id: 'asset-fresh-produce',
    title: 'Heirloom Organic Vegetables & Greens',
    category: 'produce',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Nadine Primeau (@nadineprimeau)',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Crisp organic produce emphasizing natural nutrition and farm-to-table sustainability.'
  },
  {
    id: 'asset-commercial-kitchen',
    title: 'Precision Commercial Culinary Kitchen',
    category: 'kitchen',
    url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Jason Leung (@yxns)',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'High-volume institutional stainless steel kitchen demonstrating measured batch cooking.'
  },
  {
    id: 'asset-grain-bowl',
    title: 'Plated Organic Sustainable Grain Bowl',
    category: 'produce',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Anna Pelzer (@annapelzer)',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Artfully composed healthy meal showcasing balanced portions and minimal food loss.'
  },
  {
    id: 'asset-community-distribution',
    title: 'Food Donation & Community Distribution',
    category: 'redistribution',
    url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Joel Muniz (@joelmuniz)',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Volunteers and community partners safely packing nutritious surplus meals for delivery.'
  },
  {
    id: 'asset-weighing-measurement',
    title: 'Food Measurement & Analytical Scale',
    category: 'sustainability',
    url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Brooke Lark (@brookelark)',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Calibrated food ingredients weighing and inventory quantification.'
  },
  {
    id: 'asset-sustainable-earth',
    title: 'Closed Loop Organic Farming Soil & Leaves',
    category: 'texture',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Karsten Würth (@karsten_wuerth)',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Lush natural organic leaf textures reinforcing ecological restoration.'
  }
];
