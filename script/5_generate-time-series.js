import * as fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { csvFormatBody, max } from "d3";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import INTERESTED_YEAR_RANGE from "../config/year-range.json" with {
    type: "json",
};
import NODES_AND_EDGES from "../data/nodes-and-edges.json" with {
    type: "json",
};

const OUTPUT_DIR_PATH = path.join(
    import.meta.dirname,
    "../data/time-series",
);
const DB_PATH = path.join(
    import.meta.dirname,
    "../data/dblp.sqlite3",
);

const db = new Database(
    DB_PATH,
    // { verbose: console.log }
);

try {
    await fs.rm(OUTPUT_DIR_PATH, { recursive: true });
} catch {}
await fs.mkdir(OUTPUT_DIR_PATH, { recursive: true });

const years = Array.from({
    length: INTERESTED_YEAR_RANGE[1] - INTERESTED_YEAR_RANGE[0] + 1,
}, (_, i) => INTERESTED_YEAR_RANGE[0] + i);

const queryResult = db.prepare(
    /* sql */ `
    SELECT DISTINCT
        publication_person.person_id AS person,
        CASE
            ${
        INTERESTED_CONFERENCES.map((conference) =>
            /* sql */ `WHEN publication.booktitle LIKE '%${conference}%' THEN '${conference}'`
        ).join("\n")
    }
        END AS conference,
        publication.year AS year,
        COUNT(publication.id) AS count
    FROM
        publication,
        publication_person
    WHERE
        (${
        INTERESTED_CONFERENCES.map((conference) =>
            /* sql */ `publication.booktitle LIKE '%${conference}%'`
        ).join(" OR ")
    }) AND
        publication.id = publication_person.publication_id AND
        (publication.year BETWEEN ${INTERESTED_YEAR_RANGE[0]} AND ${
        INTERESTED_YEAR_RANGE[1]
    })
    GROUP BY
        person,
        conference,
        year
    ORDER BY
        person,
        conference,
        year
    `,
).all();

const allValues = queryResult.map((d) => d.count);
const metadata = { min: 0, max: max(allValues) };
await fs.writeFile(
    path.join(OUTPUT_DIR_PATH, `metadata.json`),
    JSON.stringify(metadata),
);

const groupedByPerson = Object.groupBy(queryResult, ({ person }) => person);

NODES_AND_EDGES.nodes.forEach(async (node) => {
    const personId = node.id;
    const recordsForPerson = groupedByPerson[personId];
    const groupedByConference = Object.groupBy(
        recordsForPerson,
        ({ conference }) => conference,
    );
    const result = INTERESTED_CONFERENCES.map((conference) => {
        const recordsForConference = groupedByConference[conference];
        const groupedByYear = recordsForConference
            ? Object.groupBy(
                recordsForConference,
                ({ year }) => year,
            )
            : {};
        return years.map((year) => groupedByYear[year]?.[0]?.count ?? 0);
    });
    await fs.writeFile(
        path.join(OUTPUT_DIR_PATH, `${node.id}.csv`),
        csvFormatBody(result),
    );
});
