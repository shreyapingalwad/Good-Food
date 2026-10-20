export interface AssetRecord {
  id: string;
  title: string;
  category: 'produce' | 'dishes' | 'kitchen' | 'redistribution' | 'sustainability' | 'texture';
  url: string;
  source: string;
  author: string;
  license: string;
  licenseUrl: string;
  description: string;
}

export const ASSET_MANIFEST: AssetRecord[] = [
  // --- DISHES ---
  {
    id: 'dish-dal-rice',
    title: 'Dal Tadka & Steamed Basmati Rice',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Monika Grabkowska',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Golden spiced yellow lentils garnished with fresh cilantro and aromatic steamed basmati rice.'
  },
  {
    id: 'dish-paneer-masala',
    title: 'Paneer Butter Masala',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Saveurs Secretes',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Rich cottage cheese simmered in a creamy tomato and butter gravy with fresh cream drizzle.'
  },
  {
    id: 'dish-roti-raita',
    title: 'Tandoori Roti & Cucumber Mint Raita',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Kunal Lakhotia',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Crisp whole-wheat hearth-baked flatbread served with chilled probiotic herb yogurt.'
  },
  {
    id: 'dish-sprout-salad',
    title: 'Organic Green Sprout & Beetroot Salad',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Anna Pelzer',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Fresh sprouted legumes, crisp garden radishes, baby spinach, and roasted beetroot.'
  },
  {
    id: 'dish-gulab-jamun',
    title: 'Gulab Jamun with Cardamom Syrup',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Prabal Pratap Singh',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Golden caramelized milk dumplings soaked in aromatic rose and cardamom infusion.'
  },
  {
    id: 'dish-subz-biryani',
    title: 'Subz Biryani with Roasted Jeera Raita',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Mitesh Patel',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Fragrant saffron basmati layered with seasonal farm vegetables and toasted whole spices.'
  },
  {
    id: 'dish-moong-dal',
    title: 'Yellow Moong Dal Fry',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Andy Holmes',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Comforting split yellow moong lentils tempered with cumin, garlic, and ghee.'
  },
  {
    id: 'dish-phulka',
    title: 'Phulka Rotis (Whole Wheat)',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Shubham Dhage',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Puffed soft whole-wheat artisanal rotis made fresh on open flame.'
  },
  {
    id: 'dish-fruit-custard',
    title: 'Fruit Custard with Almond Flakes',
    category: 'dishes',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    source: 'Unsplash',
    author: 'Brooke Lark',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Chilled vanilla custard layered with pomegranate, crisp apples, and slivered almonds.'
  },

  // --- KITCHEN & WORKFLOW ---
  {
    id: 'kitchen-commercial-batch',
    title: 'Commercial Culinary Batch Cooking',
    category: 'kitchen',
    url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Jason Leung',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'High-volume commercial stainless steel kitchen demonstrating precision batching.'
  },
  {
    id: 'kitchen-chef-prep',
    title: 'Chef Precision Ingredient Weighing',
    category: 'kitchen',
    url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Brooke Lark',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Calibrated culinary digital scale ensuring exact recipe proportions.'
  },
  {
    id: 'kitchen-hot-holding',
    title: 'Thermal Hot Holding Gastronorm Containers',
    category: 'kitchen',
    url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Fabrizio Manno',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Professional insulated food transport containers maintaining >65°C core temperature.'
  },

  // --- REDISTRIBUTION & COMMUNITY ---
  {
    id: 'redist-shelter-distribution',
    title: 'Community Shelter Meal Handover',
    category: 'redistribution',
    url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Joel Muniz',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Volunteers and community shelter coordinators safely distributing hot nutritious meals.'
  },
  {
    id: 'redist-hygiene-packing',
    title: 'Sanitized Sealed Meal Packaging',
    category: 'redistribution',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Ella Olsson',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Nutritious unserved food packed in tamper-evident food-grade containers.'
  },

  // --- SUSTAINABILITY & PROBLEM CONTRAST ---
  {
    id: 'sust-landfill-waste',
    title: 'Unavoidable Food Waste & Landfill Dilemma',
    category: 'sustainability',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Antoine GIRET',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Visual representation of municipal landfill methane emissions from discarded organics.'
  },
  {
    id: 'sust-organic-soil',
    title: 'Closed-Loop Composting & Regenerative Earth',
    category: 'sustainability',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Karsten Würth',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Rich organic soil enriched by diverted food scraps through vermicomposting.'
  },
  {
    id: 'sust-fresh-harvest',
    title: 'Heirloom Organic Harvest & Farm-to-Table',
    category: 'produce',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    source: 'Unsplash',
    author: 'Nadine Primeau',
    license: 'Unsplash License (Free commercial & non-commercial use)',
    licenseUrl: 'https://unsplash.com/license',
    description: 'Vibrant organic bell peppers, garden tomatoes, and leafy greens.'
  }
];
