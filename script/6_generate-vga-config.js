import * as fs from "node:fs/promises";
import path from "node:path";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import CONFERENCE_COLORS from "../config/colors.json" with { type: "json" };

const OUTPUT_PATH = path.join(
    import.meta.dirname,
    "../data/app.vgaconf.json",
);

const config = {
    fileBasePath: "",
    pageTitle: "DBLP",
    favicon: "https://dblp.org/img/favicon.ico",
    preferCanvas: false,
    view: {
        center: [
            0,
            0,
        ],
        zoom: 5,
    },
    imports: {
        "metadata": "./plugin/metadata.plugin.js",
        "tile-layer": "./plugin/tile-layer.plugin.js",
        "gl-layer": "./plugin/gl-layer.plugin.js",
    },
    plugins: [
        {
            import: "metadata",
            container: "sidebar",
            containerProps: {
                slot: "top",
            },
        },
        {
            import: "gl-layer",
            container: "main",
            props: {
                displayName: "DBLP",
                active: true,
                type: "base-layer",
                tileSource: "./tiles/{z}/{x}/{y}.pbf",
                tileMetadata: "./tiles/metadata.json",
                conferences: INTERESTED_CONFERENCES,
                conferenceColors: CONFERENCE_COLORS,
            },
        },
    ],
};

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, JSON.stringify(config));
