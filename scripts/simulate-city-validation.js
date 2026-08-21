const CITY_CATALOG = {
  orlandia: { id: 'city-orlandia', name: 'Orlândia', latitude: -20.72, longitude: -48.91, radiusM: 7000 },
  salesOliveira: { id: 'city-sales', name: 'Sales Oliveira', latitude: -20.78, longitude: -47.84, radiusM: 7000 },
  nuporanga: { id: 'city-nuporanga', name: 'Nuporanga', latitude: -21.74, longitude: -49.22, radiusM: 7000 },
};

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validateReportLocation({ userCityId, reportCityId, reportLatitude, reportLongitude }) {
  if (!userCityId && !reportCityId) {
    return { ok: false, reason: 'Usuário sem city_id cadastrado' };
  }

  const resolvedCityId = reportCityId || userCityId;
  const city = Object.values(CITY_CATALOG).find((item) => item.id === resolvedCityId) || null;

  if (!city) {
    return { ok: false, reason: 'city_id não encontrado no catálogo', cityId: resolvedCityId };
  }

  const distanceM = haversineDistanceMeters(city.latitude, city.longitude, reportLatitude, reportLongitude);
  const ok = distanceM <= city.radiusM;

  return {
    ok,
    cityId: city.id,
    cityName: city.name,
    distanceM: Number(distanceM.toFixed(2)),
    radiusM: city.radiusM,
    reason: ok ? 'dentro da área permitida' : 'fora da área permitida',
  };
}

const scenarios = [
  {
    name: 'Caso correto: perfil com city_id Orlândia e denúncia dentro do raio',
    input: { userCityId: 'city-orlandia', reportCityId: null, reportLatitude: -20.72, reportLongitude: -48.91 },
    expected: true,
  },
  {
    name: 'Caso correto: preenchido city_id e denúncia próxima da cidade',
    input: { userCityId: 'city-orlandia', reportCityId: null, reportLatitude: -20.73, reportLongitude: -48.92 },
    expected: true,
  },
  {
    name: 'Caso inválido: denúncia fora do raio permitido da cidade',
    input: { userCityId: 'city-orlandia', reportCityId: null, reportLatitude: -19.9, reportLongitude: -48.2 },
    expected: false,
  },
  {
    name: 'Caso inválido: user sem city_id e reportCityId null',
    input: { userCityId: null, reportCityId: null, reportLatitude: -20.72, reportLongitude: -48.91 },
    expected: false,
  },
  {
    name: 'Caso com city_id errado (cidade divergente)',
    input: { userCityId: 'city-sales', reportCityId: null, reportLatitude: -20.72, reportLongitude: -48.91 },
    expected: false,
  },
];

let passed = 0;
for (const scenario of scenarios) {
  const result = validateReportLocation(scenario.input);
  const ok = result.ok === scenario.expected;
  console.log(`\n${scenario.name}`);
  console.log(JSON.stringify(result, null, 2));
  if (ok) {
    passed += 1;
    console.log('STATUS: PASS');
  } else {
    console.log('STATUS: FAIL');
  }
}

console.log(`\nResumo: ${passed}/${scenarios.length} cenários passaram.`);
if (passed !== scenarios.length) {
  process.exit(1);
}
