export const woodlandsMap = {
  id: 'woodlands',
  name: 'Woodlands',
  mode: 'goc',
  kingdoms: [
    { id: 'Darkwick',    type: 'lv3', adj: ['Jabberwock', 'Sinostra', 'Hotarubi', 'Frostheim'] },
    { id: 'Jabberwock',  type: 'lv2', adj: ['E', 'C', 'Darkwick', 'G'] },
    { id: 'Obscuary',    type: 'lv2', adj: ['A', 'E', 'F'] },
    { id: 'Frostheim',   type: 'lv2', adj: ['H', 'K', 'Darkwick'] },
    { id: 'Sinostra',    type: 'lv2', adj: ['C', 'D', 'Darkwick'] },
    { id: 'Mortkranken', type: 'lv2', adj: ['F', 'H', 'J'] },
    { id: 'Hotarubi',    type: 'lv2', adj: ['D', 'L', 'Darkwick'] },
    { id: 'A', type: 'lv1', adj: ['Obscuary', 'B'] },
    { id: 'B', type: 'lv1', adj: ['A', 'C'] },
    { id: 'C', type: 'lv1', adj: ['B', 'Sinostra', 'Jabberwock'] },
    { id: 'D', type: 'lv1', adj: ['Sinostra', 'Hotarubi'] },
    { id: 'E', type: 'lv1', adj: ['Obscuary', 'Jabberwock'] },
    { id: 'F', type: 'lv1', adj: ['G', 'Obscuary', 'Mortkranken'] },
    { id: 'G', type: 'lv1', adj: ['F', 'H', 'Jabberwock'] },
    { id: 'H', type: 'lv1', adj: ['G', 'Mortkranken', 'Frostheim'] },
    { id: 'J', type: 'lv1', adj: ['Mortkranken', 'K'] },
    { id: 'K', type: 'lv1', adj: ['J', 'L', 'Frostheim'] },
    { id: 'L', type: 'lv1', adj: ['K', 'Hotarubi'] }
  ]
};