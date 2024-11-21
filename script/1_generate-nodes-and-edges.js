import * as fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import INTERESTED_CONFERENCES from "../config/conferences.json" with {
    type: "json",
};
import INTERESTED_YEAR_RANGE from "../config/year-range.json" with {
    type: "json",
};

const DB_PATH = path.join(import.meta.dirname, "../data/dblp.sqlite3");
const OUTPUT_DIR_PATH = path.join(import.meta.dirname, "../data");

const db = new Database(
    DB_PATH,
    // { verbose: console.log }
);

const _nodes = db.prepare(
    /* sql */ `    
    SELECT DISTINCT
        pp.person_id AS id,
        CASE
        ${
        INTERESTED_CONFERENCES.map((conf) =>
            /* sql */ `WHEN publication.booktitle LIKE '%${conf}%' THEN '${conf}'`
        ).join("\n")
    }
        END AS conference,
        person.name,
        person.orcid
    FROM
        publication,
        publication_person as pp,
        person
    WHERE
        publication.year >= ${INTERESTED_YEAR_RANGE[0]} AND
        publication.year <= ${INTERESTED_YEAR_RANGE[1]} AND
        publication.id = pp.publication_id AND
        pp.person_id = person.id AND
        (${
        INTERESTED_CONFERENCES.map((conf) =>
            /* sql */ `publication.booktitle LIKE '%${conf}%'`
        ).join(" OR ")
    })
  `,
).all();

const _groupedNodes = Object.groupBy(
    _nodes,
    ({ id }) => id,
);

const nodes = Object.values(_groupedNodes).map((records) => (
    {
        id: records[0].id,
        name: records[0].name,
        orcid: records[0].orcid,
        conferences: records.map(({ conference }) => conference),
    }
));

const _edges = db.prepare(
    /* sql */ `    
    SELECT DISTINCT
        pp1.person_id AS source,
        pp2.person_id AS target,
        CASE
        ${
        INTERESTED_CONFERENCES.map((conf) =>
            /* sql */ `WHEN publication.booktitle LIKE '%${conf}%' THEN '${conf}'`
        ).join("\n")
    }
        END AS conference
    FROM
        publication,
        publication_person AS pp1,
        publication_person AS pp2
    WHERE
        publication.year >= ${INTERESTED_YEAR_RANGE[0]} AND
        publication.year <= ${INTERESTED_YEAR_RANGE[1]} AND
        publication.id = pp1.publication_id AND
        pp1.publication_id = pp2.publication_id AND
        pp1.person_id < pp2.person_id AND
        (${
        INTERESTED_CONFERENCES.map((conf) =>
            /* sql */ `publication.booktitle LIKE '%${conf}%'`
        ).join(" OR ")
    })
  `,
).all();

const _groupedEdges = Object.groupBy(
    _edges,
    ({ source, target }) => `${source}_${target}`,
);

const edges = Object.values(_groupedEdges).map((records) => (
    {
        source: records[0].source,
        target: records[0].target,
        conferences: records.map(({ conference }) => conference),
    }
));

await fs.mkdir(path.dirname(OUTPUT_DIR_PATH), { recursive: true });
await fs.writeFile(
    path.join(OUTPUT_DIR_PATH, "nodes-and-edges.json"),
    JSON.stringify({ nodes, edges }),
);
