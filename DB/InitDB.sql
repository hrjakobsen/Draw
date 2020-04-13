CREATE DATABASE canvasdb;

CREATE USER canvasuser WITH PASSWORD 'test';
GRANT ALL PRIVILEGES ON DATABASE canvasdb to canvasuser;

CREATE table canvas (
    id SERIAL PRIMARY KEY,
    name text NOT NULL
);

CREATE table drawLine (
    canvasID BIGINT references Canvas(id),
    color text NOT NULL,
    width bigint NOT NULL,
    points Point[] not null
);

