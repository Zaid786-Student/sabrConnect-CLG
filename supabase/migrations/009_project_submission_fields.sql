-- Adds the fields needed for the redesigned "Submit Project" form:
-- problem statement, theme, PPT upload, and current build stage.
alter table submissions
  add column if not exists problem_statement text,
  add column if not exists theme text,
  add column if not exists ppt_url text,
  add column if not exists ppt_file_name text,
  add column if not exists stage text check (
    stage is null or stage in ('Idea Stage', 'Prototype Ready', 'Functional Prototype', 'Ready to Deploy')
  );
