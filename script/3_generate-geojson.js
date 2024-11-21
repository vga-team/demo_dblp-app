import path from "node:path";
import * as fs from "node:fs/promises";
import { max, min, scaleLinear } from "d3";
import NODES_LAYOUT from "../data/nodes-layout.json" with { type: "json" };
import NODES_AND_EDGES from "../data/nodes-and-edges.json" with {
    type: "json",
};

const OUTPUT_PATH = path.join(import.meta.dirname, "../data/graph.geojson");
const PADDING_RATIO_X = 0.75;
const PADDING_RATIO_Y = 0.75;

const minX = min(NODES_LAYOUT.map((d) => d.x));
const maxX = max(NODES_LAYOUT.map((d) => d.x));
const minY = min(NODES_LAYOUT.map((d) => d.y));
const maxY = max(NODES_LAYOUT.map((d) => d.y));
const scaleX = scaleLinear().range([
    -180 * (1 - PADDING_RATIO_X),
    180 * (1 - PADDING_RATIO_X),
]).domain([minX, maxX]);
const scaleY = scaleLinear().range([
    -90 * (1 - PADDING_RATIO_Y),
    90 * (1 - PADDING_RATIO_Y),
]).domain([minY, maxY]);
const geojsonObject = {
    type: "FeatureCollection",
    features: NODES_LAYOUT.map((node) => ({
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [scaleX(node.x), scaleY(node.y)],
        },
        properties: {
            id: node.id,
            name: node.name,
            orcid: node.orcid,
            type: node.type,
            conferences: node.conferences,
        },
    })).concat(NODES_AND_EDGES.edges.map(({ source, target, conferences }) => {
        const node1 = NODES_LAYOUT.find((n) => n.id === source);
        const node2 = NODES_LAYOUT.find((n) => n.id === target);
        return {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [
                    [scaleX(node1.x), scaleY(node1.y)],
                    [scaleX(node2.x), scaleY(node2.y)],
                ],
            },
            properties: {
                source,
                target,
                conferences,
            },
        };
    })),
};
await fs.writeFile(OUTPUT_PATH, JSON.stringify(geojsonObject));
