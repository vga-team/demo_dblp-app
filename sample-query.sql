SELECT DISTINCT
  CASE
    WHEN publication.booktitle LIKE '%Graph Drawing%' THEN 'Graph Drawing'
    WHEN publication.booktitle LIKE '%IEEE VIS%' THEN 'IEEE VIS'
    WHEN publication.booktitle LIKE '%PacificVis%' THEN 'PacificVis'
    WHEN publication.booktitle LIKE '%EuroVis%' THEN 'EuroVis'
  END AS conference,
  person.id AS person_id,
  person.name AS person_name,
  person.orcid AS person_orcid,
  publication.year AS year
FROM
  publication,
  person,
  publication_person
WHERE
  publication.id = publication_person.publication_id AND
  person.id = publication_person.person_id AND
  (
    publication.booktitle LIKE '%Graph Drawing%' OR
    publication.booktitle LIKE '%IEEE VIS%' OR
    publication.booktitle LIKE '%PacificVis%' OR
    publication.booktitle LIKE '%EuroVis%'
  ) AND
  year >= 2005 AND year < 2010
  