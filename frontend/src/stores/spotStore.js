import { defineStore } from 'pinia';
import { ref } from 'vue';
import { spotApi } from '@/api/spotApi';
export const useSpotStore = defineStore('spot', () => {
    const spots = ref([]);
    const loading = ref(false);
    async function fetchSpots(params) {
        loading.value = true;
        try {
            const res = await spotApi.search(params || {});
            spots.value = res.data.data.content;
        }
        finally {
            loading.value = false;
        }
    }
    return { spots, loading, fetchSpots };
});
