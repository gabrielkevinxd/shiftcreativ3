export interface PricingInput {
  photos: number;
  drone: number;
  ia: number;
  videosCount: number; // Quantidade de vídeos extras ou selecionados
}

export interface PricingBreakdown {
  packKey: 'pack1' | 'pack2' | 'pack3';
  packLabel: string;
  basePrice: number;
  includedPhotos: number;
  includedDrone: number;
  includedIa: number;
  extraPhotos: number;
  extraPhotosCost: number;
  extraDrone: number;
  extraDroneCost: number;
  extraIa: number;
  extraIaCost: number;
  extraVideosCost: number;
  total: number;
}

export const PACK_CONFIGS = {
  pack1: {
    label: 'PACK 1',
    price: 80,
    photos: 20,
    drone: 0,
    ia: 2,
  },
  pack2: {
    label: 'PACK 2',
    price: 100,
    photos: 25,
    drone: 5,
    ia: 5,
  },
  pack3: {
    label: 'PACK 3',
    price: 230,
    photos: 40,
    drone: 10,
    ia: 9999, // Ilimitado
  },
};

const EXTRA_RATES = {
  photo: 3,  // 3€ por foto extra (correção ou adicional)
  drone: 3,  // 3€ por imagem drone adicional
  ia: 3,     // 3€ por imagem de IA adicional
  video: 35, // Preço base para vídeo Reels adicional (30s)
};

/**
 * Calcula o custo detalhado de um projeto sob um pacote específico.
 */
export function calculatePackCost(
  packKey: 'pack1' | 'pack2' | 'pack3',
  input: PricingInput
): PricingBreakdown {
  const config = PACK_CONFIGS[packKey];
  
  // Fotos extras
  const extraPhotos = Math.max(0, input.photos - config.photos);
  const extraPhotosCost = extraPhotos * EXTRA_RATES.photo;
  
  // Drone extras
  const extraDrone = Math.max(0, input.drone - config.drone);
  const extraDroneCost = extraDrone * EXTRA_RATES.drone;
  
  // IA extras
  const extraIa = config.ia === 9999 ? 0 : Math.max(0, input.ia - config.ia);
  const extraIaCost = extraIa * EXTRA_RATES.ia;

  // Vídeos adicionais (1 vídeo já está incluso em qualquer pacote, o restante é cobrado à parte)
  const extraVideos = Math.max(0, input.videosCount - 1);
  const extraVideosCost = extraVideos * EXTRA_RATES.video;

  const total = config.price + extraPhotosCost + extraDroneCost + extraIaCost + extraVideosCost;

  return {
    packKey,
    packLabel: config.label,
    basePrice: config.price,
    includedPhotos: config.photos,
    includedDrone: config.drone,
    includedIa: config.ia,
    extraPhotos,
    extraPhotosCost,
    extraDrone,
    extraDroneCost,
    extraIa,
    extraIaCost,
    extraVideosCost,
    total,
  };
}

/**
 * Retorna os cálculos para todos os pacotes e aponta qual é o melhor faturamento (mais barato).
 */
export function getOptimizedPricing(input: PricingInput) {
  const pack1 = calculatePackCost('pack1', input);
  const pack2 = calculatePackCost('pack2', input);
  const pack3 = calculatePackCost('pack3', input);

  const options = [pack1, pack2, pack3];
  
  // Encontra a opção mais barata
  const recommended = options.reduce((cheapest, current) => {
    return current.total < cheapest.total ? current : cheapest;
  }, pack1);

  return {
    breakdowns: { pack1, pack2, pack3 },
    recommended,
  };
}
