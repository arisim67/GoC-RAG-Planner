export const wetlandMap = {
  id: 'wetland',
  name: 'Wetland',
  mode: 'goc',
  kingdoms: [
    { id: 'Darkwick',    type: 'lv3', adj: ['E', 'Mortkranken', 'Jabberwock', 'Obscuary'] },
    { id: 'Vagastrom',   type: 'lv2', adj: ['C', 'D', 'F', 'H'] },
    { id: 'Jabberwock',  type: 'lv2', adj: ['Sinostra', 'Darkwick'] },
    { id: 'Obscuary',    type: 'lv2', adj: ['F', 'H', 'J', 'Darkwick'] },
    { id: 'Frostheim',   type: 'lv2', adj: [] },
    { id: 'Sinostra',    type: 'lv2', adj: ['K', 'N', 'J', 'Jabberwock'] },
    { id: 'Mortkranken', type: 'lv2', adj: ['B', 'D', 'Darkwick'] },
    { id: 'Hotarubi',    type: 'lv2', adj: [] },
    { id: 'A', type: 'lv1', adj: ['B', 'C'] },
    { id: 'B', type: 'lv1', adj: ['A', 'Mortkranken'] },
    { id: 'C', type: 'lv1', adj: ['A', 'Vagastrom'] },
    { id: 'D', type: 'lv1', adj: ['Mortkranken', 'Vagastrom'] },
    { id: 'E', type: 'lv1', adj: ['G', 'Darkwick'] },
    { id: 'F', type: 'lv1', adj: ['Vagastrom', 'Obscuary'] },
    { id: 'G', type: 'lv1', adj: ['E', 'K'] },
    { id: 'H', type: 'lv1', adj: ['L', 'Obscuary', 'Vagastrom'] },
    { id: 'J', type: 'lv1', adj: ['M', 'Sinostra', 'Obscuary'] },
    { id: 'K', type: 'lv1', adj: ['G', 'N', 'Sinostra'] },
    { id: 'L', type: 'lv1', adj: ['M', 'H'] },
    { id: 'M', type: 'lv1', adj: ['L', 'J'] },
    { id: 'N', type: 'lv1', adj: ['K', 'Sinostra'] }
  ]
};