// maps/art.js
// The pictures the Map view draws for each town (images/map/). Buildings: [width, height, middle]:
// the picture's size, drawn at that size in map units, and where the building's middle is across it
// (0.5 = centered; Jabberwock's clouds stick out to one side).
//
// Towns: every level 1 town is the same building with one of the cats in front, picked at random
// per server and town (like the game does). To add a cat, put its picture in images/map/town/ and
// its name here.

export const BUILDINGS = {
  Hotarubi: [136, 162, 0.471],
  Obscuary: [187, 195, 0.481],
  Frostheim: [202, 182, 0.51],
  Vagastrom: [152, 174, 0.48],
  Jabberwock: [250, 192, 0.38],
  Sinostra: [148, 166, 0.51],
  Mortkranken: [173, 204, 0.54],
  Dionysia: [201, 176, 0.49],
  Darkwick: [247, 243, 0.47],
};

// Dorms and Darkwick with a ghoul in front (images/map/dorm/<building>/<ghoul>.webp), picked at random
// per server like the town cats. A dorm only lists its own house's members; Darkwick can have anyone.
// A building with none listed here is drawn on its own.
export const GHOULS = {
  Darkwick: {
    alan: [247, 236, 0.466],
    edward: [247, 236, 0.466],
    elias: [247, 236, 0.466],
    haku: [247, 236, 0.466],
    haru: [247, 236, 0.466],
    jin: [247, 236, 0.466],
    jiro: [247, 236, 0.466],
    jo: [247, 236, 0.466],
    kaito: [247, 236, 0.466],
    leo: [247, 236, 0.466],
    luca: [247, 236, 0.466],
    lyca: [247, 236, 0.466],
    mio: [247, 236, 0.466],
    ren: [247, 236, 0.466],
    ritsu: [247, 236, 0.466],
    romeo: [247, 236, 0.466],
    rui: [247, 236, 0.466],
    shion: [247, 236, 0.466],
    sho: [247, 236, 0.466],
    subaru: [247, 236, 0.466],
    taiga: [247, 236, 0.466],
    tohma: [247, 236, 0.466],
    towa: [247, 236, 0.466],
    yuri: [247, 236, 0.466],
    zenji: [247, 236, 0.466],
  },
  Dionysia: { elias: [192, 176, 0.49], jo: [192, 176, 0.49], mio: [192, 176, 0.49], shion: [192, 176, 0.49] },
  Frostheim: { jin: [202, 182, 0.51], kaito: [202, 182, 0.51], luca: [202, 182, 0.51], tohma: [202, 182, 0.51] },
  Hotarubi: { haku: [136, 162, 0.471], subaru: [136, 162, 0.471], zenji: [136, 162, 0.471] },
  Jabberwock: { haru: [250, 192, 0.376], ren: [250, 192, 0.376], towa: [250, 192, 0.376] },
  Mortkranken: { jiro: [173, 202, 0.538], yuri: [173, 202, 0.538] },
  Obscuary: { edward: [187, 195, 0.487], lyca: [187, 195, 0.487], rui: [187, 195, 0.481] },
  Sinostra: { ritsu: [148, 166, 0.514], romeo: [148, 166, 0.514], taiga: [148, 166, 0.514] },
  Vagastrom: { alan: [152, 174, 0.48], leo: [152, 174, 0.48], sho: [152, 174, 0.48] },
};

export const TOWN_SIZE = [138, 140];
export const TOWN_CATS = [
  'ala',
  'edw',
  'eli',
  'hak',
  'har',
  'jin',
  'jir',
  'kai',
  'kon',
  'leo',
  'luc',
  'lyc',
  'mio',
  'ren',
  'rit',
  'rom',
  'rui',
  'shi',
  'sho',
  'sub',
  'tai',
  'toh',
  'tow',
  'yur',
  'zen',
];
