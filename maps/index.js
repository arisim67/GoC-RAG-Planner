// maps/index.js

import { floatingMap } from './floating.js';
import { galaxyMap } from './galaxy.js';
import { poseidonMap } from './poseidon.js';

import { forestMap } from './forest.js';
import { wetlandMap } from './wetland.js';
import { badlandsMap } from './badlands.js';
import { snowfieldMap } from './snowfield.js';
import { woodlandsMap } from './woodlands.js';

export const RAG_MAPS = {
  floating: floatingMap,
  galaxy: galaxyMap,
  poseidon: poseidonMap
};

export const GOC_MAPS = {
  forest: forestMap,
  wetland: wetlandMap,
  badlands: badlandsMap,
  snowfield: snowfieldMap,
  woodlands: woodlandsMap
};

// Export your helper functions directly from here so script.js stays clean
export function getMaps(mode) { 
  return mode === 'ragnarok' ? RAG_MAPS : GOC_MAPS; 
}

export function getMapList(mode) { 
  return Object.values(getMaps(mode)).map(m => ({ key: m.id, name: m.name })); 
}

export function getMapData(mode, mapKey) { 
  return getMaps(mode)[mapKey]; 
}