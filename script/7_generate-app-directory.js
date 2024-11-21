import * as fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR_PATH = path.join(
    import.meta.dirname,
    "../dist",
);

try {
    await fs.rm(OUTPUT_DIR_PATH, { recursive: true });
} catch {}
await fs.mkdir(OUTPUT_DIR_PATH, { recursive: true });

await fs.cp(
    path.join(import.meta.dirname, "../data/tiles"),
    path.join(OUTPUT_DIR_PATH, "./tiles"),
    {
        recursive: true,
    },
);
await fs.cp(
    path.join(import.meta.dirname, "../data/time-series"),
    path.join(OUTPUT_DIR_PATH, "./time-series"),
    {
        recursive: true,
    },
);
await fs.cp(
    path.join(import.meta.dirname, "../plugin"),
    path.join(OUTPUT_DIR_PATH, "./plugin"),
    {
        recursive: true,
    },
);
await fs.cp(
    path.join(import.meta.dirname, "../data/app.vgaconf.json"),
    path.join(OUTPUT_DIR_PATH, "./app.vgaconf.json"),
);
