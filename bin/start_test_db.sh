#!/bin/bash -e
docker-compose -f docker-compose.test.yml up -d
DATABASE_URL="postgres://postgres:postgres@localhost:5432/ranger-test" yarn db:migrate
