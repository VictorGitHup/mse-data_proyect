
export const categories = [
  { id: 1, name: 'Alojamiento' },
  { id: 2, name: 'Transporte' },
  { id: 3, name: 'Tours y Actividades' },
  { id: 4, name: 'Comida y Bebida' },
  { id: 5, name: 'Eventos' },
];

export type Region = {
  name: string;
  subregions: string[];
}

export type Country = {
  name: string;
  regions: Region[];
}

export const countries: Country[] = [
  {
    name: 'México',
    regions: [
      {
        name: 'Ciudad de México',
        subregions: ['Cuauhtémoc', 'Miguel Hidalgo', 'Benito Juárez'],
      },
      {
        name: 'Jalisco',
        subregions: [],
      },
      {
        name: 'Nuevo León',
        subregions: [],
      },
      {
        name: 'Quintana Roo',
        subregions: [],
      },
      {
        name: 'Baja California',
        subregions: [],
      },
      {
        name: 'Yucatán',
        subregions: [],
      },
    ],
  },
  {
    name: 'España',
    regions: [
      {
        name: 'Andalucía',
        subregions: ['Sevilla', 'Málaga', 'Granada'],
      },
      {
        name: 'Cataluña',
        subregions: ['Barcelona', 'Girona', 'Tarragona'],
      },
      {
        name: 'Comunidad de Madrid',
        subregions: ['Madrid', 'Alcalá de Henares', 'Getafe'],
      },
    ],
  },
   {
    name: 'Argentina',
    regions: [
      {
        name: 'Buenos Aires',
        subregions: ['La Plata', 'Mar del Plata', 'Bahía Blanca'],
      },
      {
        name: 'Ciudad Autónoma de Buenos Aires',
        subregions: ['Palermo', 'Recoleta', 'San Telmo'],
      },
      {
        name: 'Córdoba',
        subregions: ['Córdoba Capital', 'Villa Carlos Paz', 'Río Cuarto'],
      },
    ],
  },
   {
    name: 'Colombia',
    regions: [
      {
        name: 'Antioquia',
        subregions: ['Medellín', 'Envigado', 'Sabaneta'],
      },
      {
        name: 'Cundinamarca',
        subregions: ['Bogotá', 'Soacha', 'Chía'],
      },
      {
        name: 'Valle del Cauca',
        subregions: ['Cali', 'Palmira', 'Buenaventura'],
      },
    ],
  },
];
