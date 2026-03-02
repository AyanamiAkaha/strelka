import { ref } from 'vue';

export const highlightedCluster = ref(-2);  // Changed from -1 to -2 (None state)
export const ppc = ref(10000);
export const imagePathBase = ref('');
export const smoothingAmount = ref(0);  // 0 = off (instant), up to 20 = cinematic
export const selectionMode = ref<'mouse' | 'center'>('mouse');
export const invertLookY = ref(false);  // false = normal (up→up), true = inverted (up→down)