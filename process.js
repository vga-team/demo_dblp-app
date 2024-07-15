import * as fs from "fs";
import Database from "better-sqlite3";
import captureEntities from "./capture-entities.js";

const inputXmlPath = "./dblp.xml";
const outputDbPAth = "./dblp.sqlite3";

const PUBLICATION_TYPES = ["inproceedings", "proceedings"];
const INTERESTED_CONFERENCES = [
  "Graph Drawing",
  "IEEE VIS",
  "PacificVis",
  "EuroVis",
];
const booktitleMatch = new RegExp(INTERESTED_CONFERENCES.join("|"));

const readStream = fs.createReadStream(inputXmlPath);

try {
  fs.unlinkSync(outputDbPAth);
} catch {}
const db = new Database(
  outputDbPAth
  // { verbose: console.log }
);

try {
  db.prepare(
    /* sql */ `
    CREATE TABLE IF NOT EXISTS publication (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dblp_key TEXT NOT NULL,
      mdate DATE,
      type TEXT,
      reviewid TEXT,
      rating TEXT,
      cdate DATE,
      title TEXT,
      year INTEGER,
      month TEXT,
      volume TEXT,
      number TEXT,
      journal TEXT,
      booktitle TEXT,
      pages TEXT,
      address TEXT,
      url TEXT,
      ee TEXT,
      cdrom TEXT,
      cite TEXT,
      publisher TEXT,
      note TEXT,
      crossref TEXT,
      isbn TEXT,
      series TEXT,
      school TEXT,
      chapter TEXT,
      publnr TEXT,
      stream TEXT,
      rel TEXT,
      UNIQUE(dblp_key)
    )
    `
  ).run();
  db.prepare(
    /* sql */ `
    CREATE TABLE IF NOT EXISTS person (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      orcid TEXT,
      UNIQUE(name, orcid)
    )
  `
  ).run();
  db.prepare(
    /* sql */ `
    CREATE TABLE IF NOT EXISTS publication_person (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publication_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL,
      role TEXT,
      FOREIGN KEY (publication_id) REFERENCES publication(id),
      FOREIGN KEY (person_id) REFERENCES person(id),
      UNIQUE(publication_id, person_id, role)
    )
    `
  ).run();

  for await (const publicationNode of captureEntities(
    readStream,
    PUBLICATION_TYPES
  )) {
    if (publicationNode == null) {
      continue;
    }
    const bookTitle = publicationNode.children?.find(
      (childNode) => childNode.name === "booktitle"
    )?.text;
    if (bookTitle?.match(booktitleMatch)) {
      const publication = {
        dblp_key: publicationNode.attributes?.key,
        mdate: publicationNode.attributes?.mdate,
        type: publicationNode.name,
      };
      const contributors = [];
      for (const { name, attributes, text } of publicationNode.children ?? []) {
        switch (name) {
          case "author":
          case "editor": {
            let personId = db
              .prepare(
                /* sql */ `SELECT id FROM person WHERE orcid = ? OR name = ?`
              )
              .get(attributes?.orcid, text)?.id;
            if (!personId) {
              personId = db
                .prepare(
                  /* sql */ `INSERT INTO person (name, orcid) VALUES (?, ?)`
                )
                .run(text, attributes?.orcid ?? "").lastInsertRowid;
            }
            contributors.push({ id: personId, role: name });
            break;
          }
          case "year": {
            publication.year = +text;
            break;
          }
          default: {
            publication[name] = text;
            break;
          }
        }
      }
      const keys = Object.keys(publication);
      const values = Object.values(publication);
      const placeholders = values.map(() => "?").join(", ");
      const publicationId = db
        .prepare(
          /* sql */ `INSERT INTO publication (${keys.join(
            ", "
          )}) VALUES (${placeholders})`
        )
        .run(...values).lastInsertRowid;
      for (const contributor of contributors) {
        try {
          db.prepare(
            /* sql */ `INSERT INTO publication_person (publication_id, person_id, role) VALUES (?, ?, ?)`
          ).run(publicationId, contributor.id, contributor.role);
        } catch (e) {
          console.error(e, publicationNode, {
            publicationId,
            personId: contributor.id,
            role: contributor.role,
          });
        }
      }
    }
  }
} catch (e) {
  console.error(e);
}

db.close();
console.log("Done");
