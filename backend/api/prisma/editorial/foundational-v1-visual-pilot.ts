export type VisualPilotEntry = {
  slug: string;
  title: string;
  displayUrl: string;
  canonicalUrl: string;
  sourcePageUrl: string;
  license: string;
  provider: 'WIKIMEDIA_COMMONS';
  width: number;
  height: number;
  alt: string;
  note: string;
};

const commons = (
  slug: string,
  title: string,
  path: string,
  width: number,
  height: number,
  alt: string,
  note: string,
): VisualPilotEntry => ({
  slug,
  title,
  displayUrl: (() => {
    const [, bucket, filename] = path.split('/');
    return width >= 1920
      ? `https://upload.wikimedia.org/wikipedia/commons/thumb/${bucket[0]}/${bucket}/${filename}/1920px-${filename}`
      : `https://upload.wikimedia.org/wikipedia/commons/${path}`;
  })(),
  canonicalUrl: `https://upload.wikimedia.org/wikipedia/commons/${path}`,
  sourcePageUrl: `https://commons.wikimedia.org/wiki/File:${path.slice(path.indexOf('/', path.indexOf('/') + 1) + 1)}`,
  license: 'Public domain',
  provider: 'WIKIMEDIA_COMMONS',
  width,
  height,
  alt,
  note,
});

// URLs are the stable upload.wikimedia.org file paths returned by Commons API
// imageinfo. Query-string tracking parameters are intentionally not persisted.
export const foundationalV1VisualPilot: VisualPilotEntry[] = [
  commons(
    'las-meninas',
    'Las Meninas',
    '3/31/Las_Meninas%2C_by_Diego_Vel%C3%A1zquez%2C_from_Prado_in_Google_Earth.jpg',
    1920,
    2210,
    'Las Meninas, Diego Velázquez',
    'Commons file record identifies the reproduction as public domain.',
  ),
  commons(
    'mona-lisa',
    'La Gioconda',
    'e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    1920,
    2861,
    'La Gioconda, Leonardo da Vinci',
    'Commons file record identifies the reproduction as public domain.',
  ),
  commons(
    'olympia',
    'Olympia',
    '5/5c/Edouard_Manet_-_Olympia_-_Google_Art_Project_3.jpg',
    1920,
    1308,
    'Olympia, Édouard Manet',
    'Commons file record identifies the reproduction as public domain.',
  ),
  commons(
    'gran-ola-de-kanagawa',
    'La gran ola de Kanagawa',
    '0/0d/Great_Wave_off_Kanagawa2.jpg',
    1920,
    1314,
    'La gran ola de Kanagawa, Katsushika Hokusai',
    'Commons file record identifies the reproduction as public domain.',
  ),
  commons(
    'el-grito',
    'El grito',
    '8/86/Edvard_Munch_-_The_Scream_-_Google_Art_Project.jpg',
    1920,
    2428,
    'El grito, Edvard Munch',
    'Commons file record identifies the reproduction as public domain.',
  ),
  commons(
    'vincent-van-gogh',
    'Vincent van Gogh',
    '3/38/VanGogh_1887_Selbstbildnis.jpg',
    1920,
    2423,
    'Autorretrato de Vincent van Gogh',
    'The selected self-portrait is the artist’s own public-domain work, used as an explicit artist representation.',
  ),
  commons(
    'museo-del-prado',
    'Museo Nacional del Prado',
    '9/9b/Avrial-prado.jpg',
    1920,
    1432,
    'Vista histórica del Museo del Prado',
    'Historical public-domain representation of the institution, not a generic stock image.',
  ),
  commons(
    'el-nacimiento-de-venus',
    'El nacimiento de Venus',
    '4/47/La_nascita_di_Venere_%28Botticelli%29.jpg',
    1920,
    1230,
    'El nacimiento de Venus, Sandro Botticelli',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'david-de-miguel-angel',
    'David',
    '9/98/Michelangelo%27s_David_%28Foreground%29.jpg',
    1920,
    1778,
    'David, Miguel Ángel',
    'Commons file record identifies the historical sculpture and reproduction as public domain.',
  ),
  commons(
    'tres-de-mayo-1808',
    'El 3 de mayo de 1808',
    '4/48/El_Tres_de_Mayo%2C_by_Francisco_de_Goya%2C_from_Prado_in_Google_Earth.jpg',
    1920,
    1480,
    'El 3 de mayo de 1808, Francisco de Goya',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'noche-estrellada',
    'La noche estrellada',
    'e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    1920,
    1520,
    'La noche estrellada, Vincent van Gogh',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'ronda-de-noche',
    'La ronda de noche',
    '3/3a/La_ronda_de_noche%2C_por_Rembrandt_van_Rijn.jpg',
    1920,
    1562,
    'La ronda de noche, Rembrandt van Rijn',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'joven-de-la-perla',
    'La joven de la perla',
    '0/0f/1665_Girl_with_a_Pearl_Earring.jpg',
    1920,
    2274,
    'La joven de la perla, Johannes Vermeer',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'ultima-cena',
    'La última cena',
    '0/08/Leonardo_da_Vinci_%281452-1519%29_-_The_Last_Supper_%281495-1498%29.jpg',
    1920,
    1000,
    'La última cena, Leonardo da Vinci',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'escuela-de-atenas',
    'La escuela de Atenas',
    '4/49/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg',
    1920,
    1490,
    'La escuela de Atenas, Rafael',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'libertad-guiando-al-pueblo',
    'La Libertad guiando al pueblo',
    'a/a7/Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg',
    1920,
    1520,
    'La Libertad guiando al pueblo, Eugène Delacroix',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'saturno-devorando-a-su-hijo',
    'Saturno devorando a su hijo',
    '8/82/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_%281819-1823%29.jpg',
    1661,
    3051,
    'Saturno devorando a su hijo, Francisco de Goya',
    'Commons file record identifies the historical work and reproduction as public domain.',
  ),
  commons(
    'tapiz-de-bayeux',
    'Tapiz de Bayeux',
    'b/bb/Bayeux_Tapestry_scene57_Harold_death.jpg',
    1920,
    1673,
    'Tapiz de Bayeux, escena 57',
    'Commons file record identifies this historical textile image as public domain.',
  ),
  commons(
    'florencia',
    'Florencia',
    'e/e5/Cityscape_view_looking_toward_cathedral%2C_Florence%2C_Italy_LOC_4711374873.jpg',
    1024,
    759,
    'Vista urbana hacia la catedral de Florencia',
    'Commons file record identifies this Library of Congress image as having no known restrictions.',
  ),
  commons(
    'paris',
    'París',
    '1/1a/Caspar_Merian%2C_Paris_wie_solche_Ao._1620_im_wessen_gestanden%2C_1655_-_David_Rumsey.jpg',
    1920,
    1470,
    'Vista histórica de París, Caspar Merian',
    'Commons file record identifies the historical work as public domain.',
  ),
  commons(
    'louvre',
    'Museo del Louvre',
    '2/21/Louis_B%C3%A9roud%2C_La_Place_Du_Louvre%2C_1902_-_Artvee.jpg',
    1920,
    2266,
    'La plaza del Louvre, Louis Béroud',
    'Commons file record identifies the historical work as public domain.',
  ),
  commons(
    'roma',
    'Roma',
    '5/54/Panorama_van_de_stad_Rome%2C_Giovanni_Volpato%2C_naar_Francesco_Pannini%2C_1743_-_1803.png',
    1330,
    772,
    'Panorama histórico de Roma',
    'Commons file record identifies the historical panorama as public domain.',
  ),
  commons(
    'madrid',
    'Madrid',
    '3/32/Ouverture_des_Cort%C3%A8s%2C_Madrid%2C_a_la_fin_du_discours_du_Roi%2C_les_d%C3%A9put%C3%A9s_poussent_le_cri_%C2%ABMort_aux_carlistes%C2%BB%2C_de_Vierge.jpg',
    1920,
    1355,
    'Escena histórica de Madrid',
    'Commons file record identifies the historical image as public domain.',
  ),
  commons(
    'nueva-york',
    'Nueva York',
    '0/05/Panorama_of_the_Harbor_of_New_York._Staten_Island_and_the_Narrows_%28NYPL_Hades-1803857-1659396%29.jpg',
    1920,
    1391,
    'Panorama histórico del puerto de Nueva York',
    'Commons file record identifies the NYPL historical panorama as public domain.',
  ),
  commons(
    'uffizi',
    'Galería Uffizi',
    '8/83/Johan_Zoffany_-_Tribuna_of_the_Uffizi_-_Google_Art_Project.jpg',
    1920,
    1524,
    'La Tribuna de los Uffizi, Johan Zoffany',
    'Commons file record identifies the historical painting as public domain and it depicts the institution interior.',
  ),
];

export const visualPilotRightsReview = [
  {
    slug: 'guernica',
    reason:
      'The Commons candidate is a photograph/reproduction; artwork and reproduction rights require separate verification.',
  },
  {
    slug: 'pablo-picasso',
    reason: 'No portrait with sufficiently clear reusable rights selected yet.',
  },
  {
    slug: 'frida-kahlo',
    reason: 'Candidate portrait rights and reproduction status require verification.',
  },
];

export const visualPilotNoHero = [
  {
    slug: 'cubismo',
    reason:
      'Abstract movement: no permanent representative work chosen without an editorial visual policy.',
  },
  { slug: 'cuerpo', reason: 'Concept: no arbitrary artwork used as a semantic identity image.' },
];
