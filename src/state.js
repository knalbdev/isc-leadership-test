export const state = {
  role: null,           // 'assessor' | 'osis' | null
  selectedGroup: null,  // group object
  page: 'login',        // 'login' | 'groups' | 'scoring' | 'leaderboard'
};

export function setState(patch) {
  Object.assign(state, patch);
}
