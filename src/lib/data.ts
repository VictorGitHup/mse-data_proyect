
export const categories = [
  { id: 1, name: 'Alojamiento' },
  { id: 2, name: 'Transporte' },
  { id: 3, name: 'Tours y Actividades' },
  { id: 4, name: 'Comida y Bebida' },
  { id: 5, name: 'Eventos' },
];

export const countries = [
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
    name: 'México',
    regions: [
      {
        name: 'Jalisco',
        subregions: ['Guadalajara', 'Puerto Vallarta', 'Tlaquepaque'],
      },
      {
        name: 'Quintana Roo',
        subregions: ['Cancún', 'Playa del Carmen', 'Tulum'],
      },
      {
        name: 'Ciudad de México',
        subregions: ['Coyoacán', 'Polanco', 'Roma Norte'],
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
];
