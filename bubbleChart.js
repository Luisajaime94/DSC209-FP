// Mapbox Access Token
const mapboxToken = 'pk.eyJ1IjoiYW1lZWsxMjM0NSIsImEiOiJjbTNxb2w2eWEwc2I1MmtxYWphcmt2NHlsIn0.1R3OG4KmqIv3ttPkWE84ew'; // Replace with your token
mapboxgl.accessToken = mapboxToken;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-98.5795, 39.8283],
    zoom: 4,
});
const container = map.getCanvasContainer();
const svg = d3.select(container).append("svg")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100%")
    .style("height", "100%");
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
const loadAndVisualizeData = async () => {
    const data = await d3.csv("covid_data_log_200908.csv");
    for (let d of data) {
        const coordinates = await getCoordinates(d.County, d.State);
        if (coordinates) {
            d.Longitude = coordinates[0];
            d.Latitude = coordinates[1];
            d.Population = Math.exp(+d.Population); // Reverting log transform
            d.DeathsPerCapita = Math.exp(+d.Deaths) / d.Population;
        }
    }
    const validData = data.filter(d => d.Longitude && d.Latitude);
    console.log("Valid data with coordinates:", validData);
    const rScale = d3.scaleSqrt()
        .domain([d3.min(validData, d => d.Population), d3.max(validData, d => d.Population)])
        .range([5, 30]);
    const bubbles = svg.selectAll("circle")
        .data(validData)
        .enter()
        .append("circle")
        .attr("r", d => rScale(d.Population))
        .attr("fill", "steelblue")
        .attr("opacity", 0.7)
        .attr("stroke", "red")
        .attr("stroke-width", 1)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`
                    <strong>County:</strong> ${d.County}<br>
                    <strong>State:</strong> ${d.State}<br>
                    <strong>Population:</strong> ${d.Population.toLocaleString()}<br>
                    <strong>Deaths per Capita:</strong> ${(d.DeathsPerCapita * 100).toFixed(2)}%
                `);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    const updatePositions = () => {
        bubbles
            .attr("cx", d => {
                const projection = map.project([d.Longitude, d.Latitude]);
                console.log(`Projection for ${d.County}, ${d.State}:`, projection);
                return projection.x;
            })
            .attr("cy", d => {
                const projection = map.project([d.Longitude, d.Latitude]);
                return projection.y;
            });
    };
    map.on("viewreset", updatePositions);
    map.on("move", updatePositions);
    map.on("moveend", updatePositions);
    map.on("load", updatePositions);
};
const getCoordinates = async (county, state) => {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${county},${state}.json?access_token=${mapboxToken}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.features.length > 0) {
            return data.features[0].center;
        } else {
            console.warn(`No coordinates found for ${county}, ${state}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching coordinates for ${county}, ${state}:`, error);
        return null;
    }
};
loadAndVisualizeData();