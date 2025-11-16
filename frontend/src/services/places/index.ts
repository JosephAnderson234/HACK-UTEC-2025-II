import type { GetPlacesResponse, GetPlacesParams } from "@/interfaces/api/places";
import { loadEnv } from "@/utils/loaderEnv";
import { useToken } from "@/store/authStore";

const PLACES_URL = loadEnv('PLACE_URL');

export const getPlaces = async (params?: GetPlacesParams) => {
    const token = useToken.getState().token;
    if (!token) {
        throw new Error('User is not authenticated');
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.tower) queryParams.append('tower', params.tower);
    if (params?.floor) queryParams.append('floor', params.floor.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.term) queryParams.append('term', params.term);

    const url = queryParams.toString() ? `${PLACES_URL}?${queryParams.toString()}` : PLACES_URL;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Error fetching places');
    }

    return response.json() as Promise<GetPlacesResponse>;
}
