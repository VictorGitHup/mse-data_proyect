
export const categories = [
  { id: 1, name: 'Scorts' },
  { id: 2, name: 'Chicas Trans' },
  { id: 3, name: 'Scorts Gay' },
  { id: 4, name: 'Servicios Virtuales' },
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
    name: 'Colombia',
    regions: [
      {
        name: 'Amazonas',
        subregions: ['Leticia', 'Puerto Nariño'],
      },
      {
        name: 'Antioquia',
        subregions: [
          'Medellín',
          'Envigado',
          'Itagüí',
          'Bello',
          'Sabaneta',
          'Rionegro',
          'Apartadó',
        ],
      },
      {
        name: 'Arauca',
        subregions: ['Arauca', 'Saravena', 'Arauquita', 'Tame'],
      },
      {
        name: 'Atlántico',
        subregions: [
          'Barranquilla',
          'Soledad',
          'Malambo',
          'Puerto Colombia',
          'Galapa',
        ],
      },
      {
        name: 'Bolívar',
        subregions: [
          'Cartagena',
          'Magangué',
          'Turbaco',
          'Arjona',
          'El Carmen de Bolívar',
        ],
      },
      {
        name: 'Boyacá',
        subregions: [
          'Tunja',
          'Duitama',
          'Sogamoso',
          'Chiquinquirá',
          'Paipa',
        ],
      },
      {
        name: 'Caldas',
        subregions: ['Manizales', 'Chinchiná', 'Villamaría', 'La Dorada'],
      },
      {
        name: 'Caquetá',
        subregions: ['Florencia', 'San Vicente del Caguán', 'Puerto Rico'],
      },
      {
        name: 'Casanare',
        subregions: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena'],
      },
      {
        name: 'Cauca',
        subregions: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada'],
      },
      {
        name: 'Cesar',
        subregions: ['Valledupar', 'Aguachica', 'Codazzi', 'La Jagua de Ibirico'],
      },
      {
        name: 'Chocó',
        subregions: ['Quibdó', 'Istmina', 'Tadó', 'Bahía Solano'],
      },
      {
        name: 'Córdoba',
        subregions: ['Montería', 'Lorica', 'Sahagún', 'Cereté'],
      },
      {
        name: 'Cundinamarca',
        subregions: [
          'Bogotá',
          'Soacha',
          'Chía',
          'Zipaquirá',
          'Facatativá',
          'Mosquera',
          'Madrid',
        ],
      },
      {
        name: 'Guainía',
        subregions: ['Inírida'],
      },
      {
        name: 'Guaviare',
        subregions: ['San José del Guaviare', 'Calamar'],
      },
      {
        name: 'Huila',
        subregions: ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
      },
      {
        name: 'La Guajira',
        subregions: ['Riohacha', 'Maicao', 'Uribia', 'Manaure'],
      },
      {
        name: 'Magdalena',
        subregions: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'],
      },
      {
        name: 'Meta',
        subregions: [
          'Villavicencio',
          'Acacías',
          'Granada',
          'Puerto López',
        ],
      },
      {
        name: 'Nariño',
        subregions: ['Pasto', 'Tumaco', 'Ipiales', 'La Unión'],
      },
      {
        name: 'Norte de Santander',
        subregions: ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
      },
      {
        name: 'Putumayo',
        subregions: ['Mocoa', 'Puerto Asís', 'Orito'],
      },
      {
        name: 'Quindío',
        subregions: ['Armenia', 'Calarcá', 'Montenegro', 'La Tebaida'],
      },
      {
        name: 'Risaralda',
        subregions: ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal'],
      },
      {
        name: 'San Andrés y Providencia',
        subregions: ['San Andrés', 'Providencia'],
      },
      {
        name: 'Santander',
        subregions: [
          'Bucaramanga',
          'Floridablanca',
          'Girón',
          'Piedecuesta',
          'Barrancabermeja',
        ],
      },
      {
        name: 'Sucre',
        subregions: ['Sincelejo', 'Corozal', 'Sampués'],
      },
      {
        name: 'Tolima',
        subregions: ['Ibagué', 'Espinal', 'Melgar', 'Honda'],
      },
      {
        name: 'Valle del Cauca',
        subregions: [
          'Cali',
          'Palmira',
          'Buenaventura',
          'Tuluá',
          'Buga',
          'Jamundí',
          'Cartago',
        ],
      },
      {
        name: 'Vaupés',
        subregions: ['Mitú'],
      },
      {
        name: 'Vichada',
        subregions: ['Puerto Carreño'],
      },
    ],
  },
];
