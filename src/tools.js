const { listCities, searchMenus, getRestaurantDetail } = require('./queries');

// Definice nástrojů pro Claude
const toolDefinitions = [
  {
    name: 'list_cities',
    description: 'Vrátí seznam měst, pro která jsou v databázi dostupná obědová menu.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_menus',
    description: 'Vyhledá obědová menu restaurací v daném městě pro konkrétní datum.',
    input_schema: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Název města, např. "Pardubice"',
        },
        date: {
          type: 'string',
          description: 'Datum ve formátu YYYY-MM-DD, pro které chceme menu',
        },
      },
      required: ['city', 'date'],
    },
  },
  {
    name: 'get_restaurant_detail',
    description: 'Vrátí detail restaurace – adresu, telefon a web.',
    input_schema: {
      type: 'object',
      properties: {
        restaurant_id: {
          type: 'number',
          description: 'ID restaurace z výsledků search_menus',
        },
      },
      required: ['restaurant_id'],
    },
  },
];

// Vykoná tool call a vrátí výsledek jako string pro Claude
function executeTool(name, input) {
  switch (name) {
    case 'list_cities': {
      const cities = listCities();
      if (cities.length === 0) return 'Žádná města nejsou v databázi.';
      return `Dostupná města: ${cities.map(c => c.name).join(', ')}`;
    }
    case 'search_menus': {
      const rows = searchMenus(input.city, input.date);
      if (rows.length === 0) {
        return `Pro město "${input.city}" na datum ${input.date} nejsou dostupná žádná menu.`;
      }
      // Seskupíme položky podle restaurace
      const grouped = {};
      for (const row of rows) {
        if (!grouped[row.restaurant_id]) {
          grouped[row.restaurant_id] = {
            name: row.restaurant,
            address: row.address,
            phone: row.phone,
            items: [],
          };
        }
        const price = row.price ? `${(row.price / 100).toFixed(0)} Kč` : 'cena neuvedena';
        grouped[row.restaurant_id].items.push(`${row.item} (${price})`);
      }
      return Object.entries(grouped)
        .map(([id, r]) =>
          `[ID:${id}] ${r.name} – ${r.address}${r.phone ? `, tel: ${r.phone}` : ''}\n` +
          r.items.map(i => `  • ${i}`).join('\n')
        )
        .join('\n\n');
    }
    case 'get_restaurant_detail': {
      const r = getRestaurantDetail(input.restaurant_id);
      if (!r) return `Restaurace s ID ${input.restaurant_id} nebyla nalezena.`;
      return [
        `${r.name}`,
        `Adresa: ${r.address}`,
        r.phone   ? `Telefon: ${r.phone}`   : null,
        r.website ? `Web: ${r.website}`     : null,
      ].filter(Boolean).join('\n');
    }
    default:
      return `Neznámý nástroj: ${name}`;
  }
}

module.exports = { toolDefinitions, executeTool };
