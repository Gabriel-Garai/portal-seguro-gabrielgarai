export async function onRequestGet({ request, env }) {
  const reply = (data, status = 200) =>
    Response.json(data, {
      status,
      headers: {
        "Cache-Control":
          status === 200 ? "public, max-age=600" : "no-store"
      }
    });

  if (!env.OPENWEATHER_API_KEY) {
    return reply({
      erro: "Configure OPENWEATHER_API_KEY no Cloudflare."
    }, 503);
  }

  const params = new URL(request.url).searchParams;
  const cidade = params.get("cidade");
  const latText = params.get("lat") ?? "-25.4284";
  const lonText = params.get("lon") ?? "-49.2733";
  const lat = Number(latText);
  const lon = Number(lonText);

  if (cidade !== null && (!cidade.trim() || cidade.length > 100)) {
    return reply({ erro: "Informe uma cidade válida." }, 400);
  }

  if (!cidade && (
    !latText.trim() || !lonText.trim() ||
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180
  )) {
    return reply({ erro: "Coordenadas inválidas." }, 400);
  }

  const url = new URL(cidade
    ? "https://api.openweathermap.org/geo/1.0/direct"
    : "https://api.openweathermap.org/data/2.5/weather"
  );

  url.searchParams.set("appid", env.OPENWEATHER_API_KEY);

  if (cidade) {
    url.searchParams.set("q", `${cidade.trim()},BR`);
    url.searchParams.set("limit", "5");
  } else {
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("units", "metric");
    url.searchParams.set("lang", "pt_br");
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cf: { cacheTtl: 600, cacheEverything: true }
    });

    if (!response.ok) {
      const erro = response.status === 401
        ? "Chave OpenWeather inválida ou ainda não ativada."
        : response.status === 429
          ? "Limite de consultas atingido. Tente mais tarde."
          : "OpenWeather indisponível no momento.";

      return reply({ erro }, 502);
    }

    const data = await response.json();

    if (cidade) {
      return reply({
        locais: data
          .filter(p => p.country === "BR")
          .map(p => ({
            nome: p.local_names?.pt || p.name,
            estado: p.state || "",
            lat: p.lat,
            lon: p.lon
          }))
      });
    }

    return reply({
      cidade: data.name,
      pais: data.sys.country,
      temperatura: data.main.temp,
      sensacao: data.main.feels_like,
      umidade: data.main.humidity,
      vento: data.wind.speed * 3.6,
      descricao: data.weather[0].description,
      codigo: data.weather[0].id,
      icone: data.weather[0].icon,
      fuso: data.timezone,
      nascerSol: data.sys.sunrise,
      porSol: data.sys.sunset,
      atualizadoEm: data.dt
    });
  } catch {
    return reply({
      erro: "Não foi possível consultar o tempo. Tente novamente."
    }, 502);
  }
}
