CREATE DATABASE canvasdb;

CREATE USER canvasuser WITH PASSWORD 'test';
GRANT ALL PRIVILEGES ON DATABASE canvasdb to canvasuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO canvasuser;
grant all on sequence canvas_id_seq to canvasuser;
grant all on sequence drawline_lineid_seq to canvasuser;

CREATE table canvas
(
    id   SERIAL PRIMARY KEY,
    salt BIGINT NOT NULL,
    url  text
);

CREATE table drawLine
(
    lineID   serial primary key,
    canvasID BIGINT references Canvas (id),
    color    text    NOT NULL,
    width    bigint  NOT NULL,
    points   Point[] NOT NULL
);

