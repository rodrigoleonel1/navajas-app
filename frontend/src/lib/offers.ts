import { api } from "./api";

export type OfferService = {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
};

export type Offer = {
  id: string;
  name: string;
  serviceIds: string[];
  services: OfferService[];
  discountPercent: number;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
};

export type OfferInput = {
  name: string;
  serviceIds: string[];
  discountPercent: number;
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean;
};

export async function listOffers(includeInactive = false): Promise<Offer[]> {
  const res = await api.get<Offer[]>("/offers", {
    params: includeInactive ? { all: "1" } : {},
  });
  return res.data;
}

export async function createOffer(input: OfferInput): Promise<Offer> {
  const res = await api.post<Offer>("/offers", input);
  return res.data;
}

export async function updateOffer(
  id: string,
  patch: Partial<OfferInput>,
): Promise<Offer> {
  const res = await api.patch<Offer>(`/offers/${id}`, patch);
  return res.data;
}
