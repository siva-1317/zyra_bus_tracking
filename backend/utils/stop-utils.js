const Stop = require("../models/Stop");

const normalizeStopName = (name = "") =>
  String(name).toLowerCase().replace(/\s+/g, "");

const cleanStopName = (name = "") =>
  String(name).trim().replace(/\s+/g, " ");

const prepareBusStopsFromMaster = async (stopsInput) => {
  const stops = Array.isArray(stopsInput) ? stopsInput : [];
  if (stops.length === 0) return { stops: [], missingStops: [] };

  const normalizedOrder = [];
  const firstNameByNormalized = {};

  stops.forEach((s) => {
    const stopName = cleanStopName(s?.stopName || "");
    const normalized = normalizeStopName(stopName);
    if (!normalized) return;
    if (!firstNameByNormalized[normalized]) {
      firstNameByNormalized[normalized] = stopName;
      normalizedOrder.push(normalized);
    }
  });

  const docs = await Stop.find({
    normalizedName: { $in: normalizedOrder },
  }).lean();
  const docByNormalized = docs.reduce((acc, d) => {
    acc[d.normalizedName] = d;
    return acc;
  }, {});

  const missingStops = normalizedOrder
    .filter((n) => !docByNormalized[n])
    .map((n) => ({ stopName: firstNameByNormalized[n] }));

  if (missingStops.length > 0) {
    return { stops: [], missingStops };
  }

  const busStops = stops
    .map((s) => {
      const stopName = cleanStopName(s?.stopName || "");
      const normalized = normalizeStopName(stopName);
      if (!normalized) return null;
      const master = docByNormalized[normalized];
      return {
        stopName: master.stopName,
        morningTime: s?.morningTime || "00:00",
        eveningTime: s?.eveningTime || "00:00",
      };
    })
    .filter(Boolean);

  return { stops: busStops, missingStops: [] };
};

const enrichBusWithStopCoords = async (busLike) => {
  if (!busLike) return busLike;
  const bus = typeof busLike.toObject === "function" ? busLike.toObject() : busLike;
  const stops = Array.isArray(bus.stops) ? bus.stops : [];
  if (stops.length === 0) return { ...bus, stops: [] };

  const normalized = [
    ...new Set(stops.map((s) => normalizeStopName(s.stopName)).filter(Boolean)),
  ];
  const docs = await Stop.find({ normalizedName: { $in: normalized } }).lean();
  const docByNormalized = docs.reduce((acc, d) => {
    acc[d.normalizedName] = d;
    return acc;
  }, {});

  return {
    ...bus,
    stops: stops.map((s) => {
      const master = docByNormalized[normalizeStopName(s.stopName)];
      return {
        ...s,
        stopName: master?.stopName || cleanStopName(s.stopName),
        lat: master?.lat ?? null,
        lng: master?.lng ?? null,
      };
    }),
  };
};

const enrichBusesWithStopCoords = async (buses) => {
  const list = Array.isArray(buses) ? buses : [];
  if (list.length === 0) return [];

  const allStops = list.flatMap((b) => (b?.stops || []));
  const normalized = [
    ...new Set(allStops.map((s) => normalizeStopName(s.stopName)).filter(Boolean)),
  ];
  const docs = await Stop.find({ normalizedName: { $in: normalized } }).lean();
  const docByNormalized = docs.reduce((acc, d) => {
    acc[d.normalizedName] = d;
    return acc;
  }, {});

  return list.map((busLike) => {
    const bus = typeof busLike.toObject === "function" ? busLike.toObject() : busLike;
    const stops = Array.isArray(bus.stops) ? bus.stops : [];
    return {
      ...bus,
      stops: stops.map((s) => {
        const master = docByNormalized[normalizeStopName(s.stopName)];
        return {
          ...s,
          stopName: master?.stopName || cleanStopName(s.stopName),
          lat: master?.lat ?? null,
          lng: master?.lng ?? null,
        };
      }),
    };
  });
};

module.exports = {
  normalizeStopName,
  cleanStopName,
  prepareBusStopsFromMaster,
  enrichBusWithStopCoords,
  enrichBusesWithStopCoords,
};
