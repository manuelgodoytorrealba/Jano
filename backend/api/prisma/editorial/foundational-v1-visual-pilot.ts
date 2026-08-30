/** Small, diverse Tier A pilot. The importer resolves titles through Commons API. */
export type VisualPilotEntry = {
  slug: string;
  title: string;
  fileTitle: string;
  alt: string;
  candidateKind: 'ARTWORK' | 'PERSON' | 'PLACE_ORGANIZATION';
};
const work = (slug: string, title: string, fileTitle: string): VisualPilotEntry => ({
  slug,
  title,
  fileTitle,
  alt: title,
  candidateKind: 'ARTWORK',
});
const person = (slug: string, title: string, fileTitle: string): VisualPilotEntry => ({
  slug,
  title,
  fileTitle,
  alt: `Retrato de ${title}`,
  candidateKind: 'PERSON',
});
const place = (slug: string, title: string, fileTitle: string): VisualPilotEntry => ({
  slug,
  title,
  fileTitle,
  alt: title,
  candidateKind: 'PLACE_ORGANIZATION',
});

export const foundationalV1VisualPilot: VisualPilotEntry[] = [
  work(
    'las-meninas',
    'Las Meninas',
    'File:Las Meninas, by Diego Velázquez, from Prado in Google Earth.jpg',
  ),
  work(
    'mona-lisa',
    'La Gioconda',
    'File:Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg',
  ),
  work(
    'el-nacimiento-de-venus',
    'El nacimiento de Venus',
    'File:La nascita di Venere (Botticelli).jpg',
  ),
  work('olympia', 'Olympia', 'File:Edouard Manet - Olympia - Google Art Project 3.jpg'),
  work(
    'noche-estrellada',
    'La noche estrellada',
    'File:Van Gogh - Starry Night - Google Art Project.jpg',
  ),
  work('gran-ola-de-kanagawa', 'La gran ola de Kanagawa', 'File:Great Wave off Kanagawa2.jpg'),
  work('el-grito', 'El grito', 'File:Edvard Munch - The Scream - Google Art Project.jpg'),
  work('david-de-miguel-angel', 'David', "File:Michelangelo's David (Foreground).jpg"),
  work(
    'tres-de-mayo-1808',
    'El 3 de mayo de 1808',
    'File:El Tres de Mayo, by Francisco de Goya, from Prado in Google Earth.jpg',
  ),
  work('ronda-de-noche', 'La ronda de noche', 'File:La ronda de noche, por Rembrandt van Rijn.jpg'),
  work('joven-de-la-perla', 'La joven de la perla', 'File:1665 Girl with a Pearl Earring.jpg'),
  work(
    'ultima-cena',
    'La última cena',
    'File:Leonardo da Vinci (1452-1519) - The Last Supper (1495-1498).jpg',
  ),
  work(
    'escuela-de-atenas',
    'La escuela de Atenas',
    'File:"The School of Athens" by Raffaello Sanzio da Urbino.jpg',
  ),
  work(
    'libertad-guiando-al-pueblo',
    'La Libertad guiando al pueblo',
    'File:Eugène Delacroix - La liberté guidant le peuple.jpg',
  ),
  work(
    'panteon-de-roma',
    'Panteón de Roma',
    "File:'Interior of the Pantheon' by Giovanni Paolo Panini, 1747.JPG",
  ),
  person(
    'leonardo-da-vinci',
    'Leonardo da Vinci',
    'File:Leonardo da Vinci - presumed self-portrait - WGA12798.jpg',
  ),
  person('vincent-van-gogh', 'Vincent van Gogh', 'File:VanGogh 1887 Selbstbildnis.jpg'),
  person('claude-monet', 'Claude Monet', 'File:Claude Monet 1899 Nadar.jpg'),
  person(
    'katsushika-hokusai',
    'Katsushika Hokusai',
    'File:Hokusai 1760-1849, Katsushika, Japan Selfportrait at the age of eighty three.jpg',
  ),
  person(
    'frida-kahlo',
    'Frida Kahlo',
    'File:Guillermo Kahlo - Frida Kahlo, June 15, 1919 - Google Art Project.jpg',
  ),
  person(
    'pablo-picasso',
    'Pablo Picasso',
    'File:Juan Gris - Portrait of Pablo Picasso - Google Art Project.jpg',
  ),
  person('edouard-manet', 'Édouard Manet', 'File:Édouard Manet - Self-Portrait with Palette.jpg'),
  place('museo-del-prado', 'Museo del Prado', 'File:Avrial-prado.jpg'),
  place(
    'paris',
    'París',
    'File:Caspar Merian, Paris wie solche Ao. 1620 im wessen gestanden, 1655 - David Rumsey.jpg',
  ),
  place('louvre', 'Museo del Louvre', 'File:Louis Béroud, La Place Du Louvre, 1902 - Artvee.jpg'),
];

export const visualPilotNoHero = [
  { slug: 'cubismo', reason: 'Movimiento abstracto: sin imagen representativa arbitraria.' },
  { slug: 'cuerpo', reason: 'Concepto: sin obra arbitraria como identidad visual.' },
  { slug: 'representacion', reason: 'Concepto: sin obra arbitraria como identidad visual.' },
];
